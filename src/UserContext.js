import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import serviceUrl from './config';
import { debugLog } from './utils/debugUtils';

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

  // Load user data from localStorage on component mount
  useEffect(() => {
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

  // Function to fetch user balance - fixed to use correct API endpoint
  const fetchUserBalance = useCallback(async (key) => {
    if (!key) return;
    
    debugLog('Fetching balance for user:', key);
    setIsLoading(true);
    
    try {
      // First try the /me/balance endpoint with the X-Public-Key header
      const response = await fetch(`${serviceUrl}/me/balance`, {
        headers: {
          'X-Public-Key': key
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        debugLog('Balance data received:', data);
        
        // Extract the balance - handle different response formats
        let newBalance = 0;
        if (data && typeof data.quote_balance !== 'undefined') {
          newBalance = Number(data.quote_balance);
        } else if (data && data.balance && typeof data.balance.quote_balance !== 'undefined') {
          newBalance = Number(data.balance.quote_balance);
        } else if (data && typeof data.balance !== 'undefined') {
          newBalance = Number(data.balance);
        }
        
        // Ensure it's a valid number
        if (isNaN(newBalance)) newBalance = 0;
        
        debugLog('Setting balance to:', newBalance);
        setBalance(newBalance);
        
        // Update userInfo with new balance
        setUserInfo(prevInfo => {
          const updatedInfo = {
            ...(prevInfo || {}),
            public_key: key,
            balance: newBalance
          };
          
          // Also ensure name is set if we have one
          if (!updatedInfo.name && (displayName || username)) {
            updatedInfo.name = displayName || username || "User";
          }
          
          return updatedInfo;
        });
        
        // Also update the balance in localStorage user object for persistence
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
        // Fallback to the older endpoint if the first one fails
        const fallbackResponse = await fetch(`${serviceUrl}/user/${key}/balance`);
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          const newBalance = Number(data.balance || 0);
          setBalance(newBalance);
          
          // Update userInfo with new balance
          setUserInfo(prevInfo => ({
            ...(prevInfo || {}),
            balance: newBalance
          }));
          
          // Update in localStorage
          try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              const userData = JSON.parse(storedUser);
              userData.balance = newBalance;
              localStorage.setItem('user', JSON.stringify(userData));
            }
          } catch (e) {
            console.error('Failed to update balance in localStorage', e);
          }
        } else {
          console.error('Both balance endpoints failed');
        }
      }
    } catch (error) {
      console.error('Error fetching user balance:', error);
    } finally {
      setIsLoading(false);
    }
  }, [displayName, username]);

  // Login function with improved key handling and persistence
  const login = useCallback(async (key, user = null) => {
    try {
      setIsLoading(true);
      
      // More aggressive validation for keys with many leading zeros
      let validatedKey = validatePublicKey(key);
      
      // Special logging for debugging key issues
      debugLog({
        original_key: key,
        validated_key: validatedKey,
        key_length: key ? key.length : 0,
        validated_length: validatedKey ? validatedKey.length : 0
      });

      // If user details are provided (from auth service), use them
      if (user) {
        setPublicKey(validatedKey);
        setUsername(user.username || null);
        setDisplayName(user.displayName || null);
        setBio(user.bio || null);
        setIsLoggedIn(true);
        
        // Save to both localStorage methods for consistency
        localStorage.setItem('publicKey', validatedKey);
        localStorage.setItem('user', JSON.stringify({
          publicKey: validatedKey,
          username: user.username,
          displayName: user.displayName,
          bio: user.bio
        }));
        
        // Fetch balance
        await fetchUserBalance(validatedKey);
        return true;
      }
      
      // Otherwise fetch user details from API
      const response = await fetch(`${serviceUrl}/user/${validatedKey}`);
      if (response.ok) {
        const data = await response.json();
        setPublicKey(validatedKey);
        setUsername(data.username || null);
        setDisplayName(data.display_name || null);
        setBio(data.bio || null);
        setIsLoggedIn(true);
        
        // Save to both localStorage methods for consistency
        localStorage.setItem('publicKey', validatedKey);
        localStorage.setItem('user', JSON.stringify({
          publicKey: validatedKey,
          username: data.username,
          displayName: data.display_name,
          bio: data.bio
        }));
        
        // Fetch balance
        await fetchUserBalance(validatedKey);
        return true;
      } else {
        console.error('Failed to fetch user data');
        return false;
      }
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserBalance]);

  // Logout function - now properly clears all stored data
  const logout = useCallback(() => {
    setPublicKey(null);
    setUsername(null);
    setDisplayName(null);
    setBio(null);
    setBalance(0);
    setIsLoggedIn(false);
    setUserInfo(null);
    
    // Clear all auth-related items from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('publicKey');
    localStorage.removeItem('privateKey');
    localStorage.removeItem('avatarUrlSmall');
    localStorage.removeItem('token');
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (updates) => {
    if (!publicKey) return false;
    
    try {
      const response = await fetch(`${serviceUrl}/user/${publicKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        // Update local state
        if (updates.username) setUsername(updates.username);
        if (updates.display_name) setDisplayName(updates.display_name);
        if (updates.bio) setBio(updates.bio);
        
        // Update localStorage
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
    
    // Ensure the balance is a valid number
    const balanceNumber = Number(newBalance);
    const validBalance = !isNaN(balanceNumber) ? balanceNumber : 0;
    
    setBalance(validBalance);
    
    setUserInfo(prevUserInfo => {
      if (!prevUserInfo) {
        // If userInfo doesn't exist yet, create it with basic data
        return {
          public_key: publicKey,
          name: displayName || username || "User",
          balance: validBalance
        };
      }
      return {
        ...prevUserInfo,
        balance: validBalance
      };
    });
    
    // Also update the balance in localStorage for persistence
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser && publicKey) {
        const userData = JSON.parse(storedUser);
        userData.balance = validBalance;
        localStorage.setItem('user', JSON.stringify(userData));
        debugLog('Updated balance in localStorage via updateUserBalance');
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