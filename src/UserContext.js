import React, { createContext, useContext, useEffect, useState } from 'react';
import serviceUrl from './config';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
    const [publicKey, setPublicKey] = useState(localStorage.getItem('publicKey') || '');
    const [userInfo, setUserInfo] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (publicKey) {
            console.log('Fetching user info for publicKey:', publicKey);
            fetchUserInfo(publicKey);
        }
    }, [publicKey]);

    const fetchUserInfo = async (key) => {
        try {
            const response = await fetch(`${serviceUrl}/users/${key}`);
            if (response.ok) {
                const data = await response.json();
                console.log('Fetched user info:', data);
                setUserInfo(data);
            } else {
                console.error('Error fetching user info:', response.status);
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    };

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const shortenPublicKey = (key, leftright = 8) => {
        return `${key.slice(0, leftright)}**${key.slice(-leftright)}`;
    };

    return (
        <UserContext.Provider value={{ publicKey, userInfo, setPublicKey, isModalOpen, openModal, closeModal, shortenPublicKey }}>
            {children}
        </UserContext.Provider>
    );
};
