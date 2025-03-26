import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import serviceUrl from './config';
import { useWebSocketConnection } from './hooks';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [publicKey, setPublicKey] = useState(localStorage.getItem('publicKey'));
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [userPositions, setUserPositions] = useState({});

  // Load user info initially
  useEffect(() => {
    if (publicKey) {
      fetchUserInfo();
    }
  }, [publicKey]);

  // Set up WebSocket for user data if logged in
  const handleBalanceUpdate = useCallback((data) => {
    // Handle balance update message format
    const balanceData = data.data || data;
    if (balanceData && typeof balanceData.quote_balance !== 'undefined') {
      setUserInfo(prev => ({
        ...prev,
        balance: balanceData.quote_balance
      }));
    }
  }, []);

  const handleUserUpdate = useCallback((data) => {
    // Handle user update message format
    const userData = data.data || data;
    setUserInfo(prev => ({
      ...prev,
      ...userData
    }));
  }, []);

  // Connect to user WebSocket
  const userWebSocket = useWebSocketConnection({
    endpoint: `/ws/user/${publicKey || '0'}`,
    publicKey
  });

  // Register for specific message types
  useEffect(() => {
    if (!userWebSocket.isConnected) return;
    
    // Register handlers for specific message types
    const unregisterBalance1 = userWebSocket.registerForMessageType('balance', handleBalanceUpdate);
    const unregisterBalance2 = userWebSocket.registerForMessageType('balance_update', handleBalanceUpdate);
    const unregisterBalanceField = userWebSocket.registerForMessageType('field:quote_balance', handleBalanceUpdate);
    const unregisterUserUpdate = userWebSocket.registerForMessageType('user_update', handleUserUpdate);
    
    // Cleanup on unmount or reconnect
    return () => {
      unregisterBalance1();
      unregisterBalance2();
      unregisterBalanceField();
      unregisterUserUpdate();
    };
  }, [userWebSocket.isConnected, userWebSocket.registerForMessageType, handleBalanceUpdate, handleUserUpdate]);

  // Fetch user info from API
  const fetchUserInfo = async () => {
    if (!publicKey) return;
    
    setIsLoading(true);
    try {
      const timestamp = Date.now();
      const response = await fetch(`${serviceUrl}/me?t=${timestamp}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': publicKey,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data);
        setConnected(true);
      } else {
        console.error('Failed to fetch user info');
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update user balance directly - can be called from any component
  const updateUserBalance = useCallback((newBalance) => {
    console.log("UserContext updating balance:", newBalance);
    if (typeof newBalance === 'number') {
      setUserInfo(prev => ({
        ...prev,
        balance: newBalance
      }));
    }
  }, []);

  // Login functions
  const login = useCallback((key, userData) => {
    localStorage.setItem('publicKey', key);
    setPublicKey(key);
    if (userData) {
      setUserInfo(userData);
    }
    setIsModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('publicKey');
    setPublicKey(null);
    setUserInfo(null);
    setUserPositions({});
  }, []);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const shortenPublicKey = (key, length = 4) => {
    if (!key) return '';
    return `${key.substring(0, length)}...${key.substring(key.length - length)}`;
  };

  const updatePositions = useCallback((newsId, positions) => {
    setUserPositions(prev => ({
      ...prev,
      [newsId]: positions
    }));
  }, []);

  // Expose the context values
  const value = {
    publicKey,
    userInfo,
    isLoading,
    login,
    logout,
    isModalOpen,
    openModal,
    closeModal,
    shortenPublicKey,
    connected,
    setConnected,
    userPositions,
    updatePositions,
    updateUserBalance,
    fetchUserInfo,
    userSocketConnected: userWebSocket.isConnected
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);