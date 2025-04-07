import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import serviceUrl from './config';

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
      console.log('UserContext: Reformatting hex key with excessive zeros');
      return cleanKey.replace(/^0+/, '1a3b');
    }
  }
  
  // Special case for keys that are mostly zeros with a few characters at the end
  if (cleanKey.length > 30 && cleanKey.match(/^0{20,}/)) {
    const nonZeroPart = cleanKey.replace(/^0+/, '');
    console.log('UserContext: Detected mostly-zero key, extracting significant part:', nonZeroPart);
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
    console.log('Setting public key:', { original: key, validated: validatedKey });
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

  // Load user data from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        // Validate the stored public key
        const validatedKey = validatePublicKey(userData.publicKey || null);
        setPublicKey(validatedKey);
        setUsername(userData.username || null);
        setDisplayName(userData.displayName || null);
        setBio(userData.bio || null);
        setIsLoggedIn(!!userData.publicKey);
        
        // Fetch latest balance from API if we have a publicKey
        if (userData.publicKey) {
          fetchUserBalance(userData.publicKey);
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

  // Function to fetch user balance
  const fetchUserBalance = useCallback(async (key) => {
    try {
      const response = await fetch(`${serviceUrl}/user/${key}/balance`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching user balance:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login function with improved key handling
  const login = useCallback(async (key, user = null) => {
    try {
      setIsLoading(true);
      
      // More aggressive validation for keys with many leading zeros
      let validatedKey = validatePublicKey(key);
      
      // Special logging for debugging key issues
      console.log({
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
        
        // Save to localStorage with the validated key
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
        
        // Save to localStorage with the validated key
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

  // Logout function
  const logout = useCallback(() => {
    setPublicKey(null);
    setUsername(null);
    setDisplayName(null);
    setBio(null);
    setBalance(0);
    setIsLoggedIn(false);
    localStorage.removeItem('user');
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
    console.log('Opening modal from UserContext');
    setIsModalOpen(true);
  }, []);
  
  // Function to close modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

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
    userInfo: {
      balance,
      name: displayName,
    }
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};