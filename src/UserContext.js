import React, { createContext, useContext, useEffect, useState } from 'react';
import serviceUrl from './config';
import { formatPublicKey } from './nostr';

// Create the context
const UserContext = createContext();

// Custom hook to use the user context
export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
    // State for user data
    const [publicKey, setPublicKey] = useState(localStorage.getItem('publicKey') || '');
    const [privateKey, setPrivateKey] = useState(localStorage.getItem('privateKey') || '');
    const [userInfo, setUserInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Modal state with debugging
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Authentication status
    const [isAuthenticated, setIsAuthenticated] = useState(Boolean(publicKey));
    
    // WebSocket connection for real-time updates
    const [wsConnection, setWsConnection] = useState(null);

    // Load user data when publicKey changes
    useEffect(() => {
        if (publicKey) {
            fetchUserInfo(publicKey);
            setIsAuthenticated(true);
        } else {
            setUserInfo(null);
            setIsAuthenticated(false);
        }
    }, [publicKey]);

    // Fetch user info from API
    const fetchUserInfo = async (key) => {
        if (!key) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            console.log('Fetching user info for publicKey:', key);
            const endpoint = `${serviceUrl}/users/${key}`;
            
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch user data: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('User data received:', data);
            
            if (data) {
                setUserInfo(data);
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Login functions with debugging
    const openModal = () => {
        console.log('Opening modal from UserContext');
        setIsModalOpen(true);
    };
    
    const closeModal = () => {
        console.log('Closing modal from UserContext');
        setIsModalOpen(false);
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('publicKey');
        localStorage.removeItem('privateKey');
        localStorage.removeItem('avatarUrlSmall');
        
        setPublicKey('');
        setPrivateKey('');
        setUserInfo(null);
        setIsAuthenticated(false);
        
        // Close WebSocket connection if open
        if (wsConnection) {
            wsConnection.close();
            setWsConnection(null);
        }
    };

    // Utility to format public keys for display
    const shortenPublicKey = (key, leftright = 8) => {
        if (!key) return '';
        return `${key.slice(0, leftright)}...${key.slice(-leftright)}`;
    };

    // Check if user has necessary permissions
    const hasPermission = (permissionType) => {
        if (!userInfo || !userInfo.permissions) return false;
        return userInfo.permissions.includes(permissionType);
    };

    // Create a signed message for authentication
    const signMessage = async (message) => {
        if (!privateKey) {
            throw new Error('No private key available for signing');
        }
        
        try {
            // In a real implementation, we would use the Nostr libraries to sign
            // For now, we'll just return a mock signature
            return `nostr:sig:${publicKey.substring(0, 10)}`;
        } catch (error) {
            console.error('Error signing message:', error);
            throw error;
        }
    };

    // Generate authentication headers for API requests
    const getAuthHeaders = async () => {
        if (!publicKey) return {};
        
        const timestamp = Date.now().toString();
        const message = `auth:${timestamp}`;
        
        try {
            const signature = await signMessage(message);
            
            return {
                'X-Public-Key': publicKey,
                'X-Auth-Timestamp': timestamp,
                'X-Auth-Signature': signature
            };
        } catch (error) {
            console.error('Error generating auth headers:', error);
            return {};
        }
    };

    // Provide context value
    const contextValue = {
        publicKey,
        setPublicKey,
        privateKey,
        setPrivateKey,
        userInfo,
        setUserInfo,
        isLoading,
        error,
        isAuthenticated,
        fetchUserInfo,
        isModalOpen,
        openModal,
        closeModal,
        logout,
        shortenPublicKey,
        formatPublicKey,
        hasPermission,
        signMessage,
        getAuthHeaders,
        wsConnection,
        setWsConnection
    };

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};