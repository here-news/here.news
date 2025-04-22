import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import serviceUrl from './config';
import { debugLog } from './utils/debugUtils';
import { apiRequest, setJwtToken, clearJwtToken } from './services/api';

// Create context
const UserContext = createContext();

// Improved helper function to validate public keys
const validatePublicKey = (key) => {
  if (!key || typeof key !== 'string') {
    return key;
  }
  
  // Remove 0x prefix if it exists
  let cleanKey = key.replace(/^0x/, '');
  
  // First check if it's a hex string with excessive leading zeros
  if (/^0+[0-9a-f]+$/.test(cleanKey)) {
    // If the key has an excessive number of leading zeros, replace them
    if (cleanKey.match(/^0{10,}/)) {
      debugLog('UserContext: Reformatting hex key with excessive zeros');
      return cleanKey.replace(/^0+/, '1a3b');
    }
  }
  
  // Special case for keys that are mostly zeros with a few characters at the end
  if (cleanKey.length > 30 && cleanKey.match(/^0{20,}/)) {
    const nonZeroPart = cleanKey.replace(/^0+/, '');
    debugLog('UserContext: Detected mostly-zero key, extracting significant part:', nonZeroPart);
    return nonZeroPart;
  }
  
  return cleanKey;
};

// Custom hook for using the user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Provider component
export const UserProvider = ({ children }) => {
  // Create a custom setter for publicKey that validates the format
  const [_publicKey, _setPublicKey] = useState(null);
  
  // Wrap the setter to validate keys before setting them
  const setPublicKey = useCallback((key) => {
    const validatedKey = validatePublicKey(key);
    debugLog('Setting public key:', { original: key, validated: validatedKey });
    _setPublicKey(validatedKey);
  }, []);
  
  // Create a publicKey getter that returns the private state
  const publicKey = _publicKey;
  
  const [username, setUsername] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [bio, setBio] = useState(null);
  const [balance, setBalance] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState(null);

  // On mount, initialize JWT from localStorage if present
  useEffect(() => {
    const storedJwt = localStorage.getItem('jwtToken');
    if (storedJwt) setJwtToken(storedJwt);

    // First check for direct publicKey storage
    const storedPublicKey = localStorage.getItem('publicKey');
    const storedUser = localStorage.getItem('user');
    
    debugLog('Loading user from localStorage', { storedPublicKey, storedUser });
    
    // If we have a direct publicKey, prioritize that
    if (storedPublicKey) {
      const validatedKey = validatePublicKey(storedPublicKey);
      setPublicKey(validatedKey);
      setIsLoggedIn(true);
      
      // Try to get additional user data if available
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUsername(userData.username || null);
          setDisplayName(userData.displayName || null);
          setBio(userData.bio || null);
          
          // Set initial userInfo with what we have
          setUserInfo({
            public_key: validatedKey,
            name: userData.displayName || userData.username || "User",
            email: userData.email || "",
            balance: userData.balance || 0
          });
          
          // Update balance if it was stored
          if (userData.balance) {
            setBalance(Number(userData.balance));
          }
        } catch (e) {
          console.error('Failed to parse user data from localStorage', e);
        }
      } else {
        // Create minimal userInfo
        setUserInfo({
          public_key: validatedKey,
          name: "User", 
          email: "",
          balance: 0
        });
      }
      
      // Fetch latest balance from API with the validated key
      fetchUserBalance(validatedKey);
    } 
    // If no direct publicKey but we have stored user data
    else if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData.publicKey) {
          const validatedKey = validatePublicKey(userData.publicKey);
          setPublicKey(validatedKey);
          setUsername(userData.username || null);
          setDisplayName(userData.displayName || null);
          setBio(userData.bio || null);
          setIsLoggedIn(true);
          
          // Also save to direct publicKey storage for consistency
          localStorage.setItem('publicKey', validatedKey);
          
          // Set userInfo
          setUserInfo({
            public_key: validatedKey,
            name: userData.displayName || userData.username || "User",
            email: userData.email || "",
            balance: userData.balance || 0
          });
          
          // Update balance if it was stored
          if (userData.balance) {
            setBalance(Number(userData.balance));
          }
          
          // Fetch latest balance
          fetchUserBalance(validatedKey);
        } else {
          setIsLoading(false);
        }
      } catch (e) {
        console.error('Failed to parse user data from localStorage', e);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  // Function to fetch user balance - now uses apiRequest and JWT
  const fetchUserBalance = useCallback(async (key) => {
    if (!key) return;
    debugLog('Fetching balance for user:', key);
    setIsLoading(true);
    try {
      // Use protected endpoint with JWT
      const response = await apiRequest(`${serviceUrl}/me/balance`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }, true);
      
      if (response.ok) {
        const data = await response.json();
        debugLog('Balance data received:', data);
        let newBalance = 0;
        if (data && typeof data.quote_balance !== 'undefined') {
          newBalance = Number(data.quote_balance);
        } else if (data && data.balance && typeof data.balance.quote_balance !== 'undefined') {
          newBalance = Number(data.balance.quote_balance);
        } else if (data && typeof data.balance !== 'undefined') {
          newBalance = Number(data.balance);
        }
        if (isNaN(newBalance)) newBalance = 0;
        debugLog('Setting balance to:', newBalance);
        setBalance(newBalance);
        setUserInfo(prevInfo => {
          const updatedInfo = {
            ...(prevInfo || {}),
            public_key: key,
            balance: newBalance
          };
          if (!updatedInfo.name && (displayName || username)) {
            updatedInfo.name = displayName || username || "User";
          }
          return updatedInfo;
        });
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            userData.balance = newBalance;
            localStorage.setItem('user', JSON.stringify(userData));
            debugLog('Updated balance in localStorage');
          } else {
            localStorage.setItem('user', JSON.stringify({
              publicKey: key,
              balance: newBalance
            }));
          }
        } catch (e) {
          console.error('Failed to update balance in localStorage', e);
        }
      } else {
        console.error('Failed to fetch balance, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user balance:', error);
    } finally {
      setIsLoading(false);
    }
  }, [displayName, username]);

  // Login function - now uses apiRequest and expects JWT
  const login = useCallback(async (key, user = null) => {
    try {
      setIsLoading(true);
      let validatedKey = validatePublicKey(key);
      debugLog({
        original_key: key,
        validated_key: validatedKey,
        key_length: key ? key.length : 0,
        validated_length: validatedKey ? validatedKey.length : 0
      });
      if (user) {
        setPublicKey(validatedKey);
        setUsername(user.username || null);
        setDisplayName(user.displayName || null);
        setBio(user.bio || null);
        setIsLoggedIn(true);
        localStorage.setItem('publicKey', validatedKey);
        localStorage.setItem('user', JSON.stringify({
          publicKey: validatedKey,
          username: user.username,
          displayName: user.displayName,
          bio: user.bio
        }));
        await fetchUserBalance(validatedKey);
        return true;
      }
      // Use protected login endpoint
      const loginResp = await apiRequest(`${serviceUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_key: validatedKey })
      }, false);
      if (loginResp.ok) {
        const loginData = await loginResp.json();
        if (loginData.token) {
          setJwtToken(loginData.token);
          localStorage.setItem('jwtToken', loginData.token);
        }
        // Optionally fetch user info here if needed
        setPublicKey(validatedKey);
        setIsLoggedIn(true);
        localStorage.setItem('publicKey', validatedKey);
        await fetchUserBalance(validatedKey);
        return true;
      } else {
        console.error('Failed to login or fetch user data');
        return false;
      }
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserBalance]);

  // Logout function - clear JWT as well
  const logout = useCallback(() => {
    setPublicKey(null);
    setUsername(null);
    setDisplayName(null);
    setBio(null);
    setBalance(0);
    setIsLoggedIn(false);
    setUserInfo(null);
    localStorage.removeItem('user');
    localStorage.removeItem('publicKey');
    localStorage.removeItem('privateKey');
    localStorage.removeItem('avatarUrlSmall');
    localStorage.removeItem('token');
    localStorage.removeItem('jwtToken');
    clearJwtToken();
  }, []);

  // Update user profile - use apiRequest and JWT
  const updateProfile = useCallback(async (updates) => {
    if (!publicKey) return false;
    try {
      const response = await apiRequest(`${serviceUrl}/user/${publicKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }, true);
      if (response.ok) {
        if (updates.username) setUsername(updates.username);
        if (updates.display_name) setDisplayName(updates.display_name);
        if (updates.bio) setBio(updates.bio);
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          localStorage.setItem('user', JSON.stringify({
            ...userData,
            username: updates.username || userData.username,
            displayName: updates.display_name || userData.displayName,
            bio: updates.bio || userData.bio
          }));
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }, [publicKey]);

  // Function to open modal
  const openModal = useCallback(() => {
    debugLog('Opening modal from UserContext');
    setIsModalOpen(true);
  }, []);
  
  // Function to close modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Fix the updateUserBalance function to ensure balance is a number and is persisted
  const updateUserBalance = useCallback((newBalance) => {
    debugLog('Updating user balance to:', newBalance);
    
    // Ensure the balance is a valid number - handle various input types
    let validBalance = 0;
    
    if (newBalance !== null && newBalance !== undefined) {
      // Handle object with quote_balance property
      if (typeof newBalance === 'object' && newBalance.quote_balance !== undefined) {
        validBalance = Number(newBalance.quote_balance);
      } 
      // Handle direct number or string
      else {
        validBalance = Number(newBalance);
      }
      
      // Final NaN check
      if (isNaN(validBalance)) {
        console.error('Invalid balance value:', newBalance);
        validBalance = 0;
      }
    }
    
    debugLog('Normalized balance value:', validBalance);
    
    // Update the balance state
    setBalance(validBalance);
    
    // Update userInfo with the new balance
    setUserInfo(prevUserInfo => {
      if (!prevUserInfo) {
        return {
          public_key: publicKey,
          name: displayName || username || "User",
          balance: validBalance,
          quote_balance: validBalance // Add this for consistency
        };
      }
      return {
        ...prevUserInfo,
        balance: validBalance,
        quote_balance: validBalance // Add this for consistency
      };
    });
    
    // Also update the balance in localStorage for persistence
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.balance = validBalance;
        userData.quote_balance = validBalance; // Add this for consistency
        localStorage.setItem('user', JSON.stringify(userData));
        debugLog('Updated balance in localStorage via updateUserBalance:', validBalance);
      } else if (publicKey) {
        // Create a basic user object if none exists
        localStorage.setItem('user', JSON.stringify({
          publicKey: publicKey,
          balance: validBalance,
          quote_balance: validBalance
        }));
        debugLog('Created new user in localStorage with balance:', validBalance);
      }
    } catch (e) {
      console.error('Failed to update balance in localStorage', e);
    }
  }, [publicKey, displayName, username]);

  // Value object with all context data and functions
  const value = {
    publicKey,
    setPublicKey,
    username,
    setUsername,
    displayName,
    setDisplayName,
    bio,
    setBio,
    balance,
    setBalance,
    isLoggedIn,
    isLoading,
    login,
    logout,
    updateProfile,
    fetchUserBalance,
    isModalOpen,
    openModal,
    closeModal,
    userSocketConnected: true,
    userInfo: userInfo || {
      public_key: publicKey,
      name: displayName || username || "User",
      balance: Number(balance) || 0,
      email: ""
    },
    error,
    updateUserBalance
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};