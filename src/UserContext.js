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
        const endpoint = `${serviceUrl}/users/${key}`;
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });
          const data = await response.json();
          console.log(data);
          if (data) {
            setUserInfo(data);
          }
        } catch (error) {
          alert('An error occurred. Please try again.');
        }
      };

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const shortenPublicKey = (key, leftright = 8) => {
        return `${key.slice(0, leftright)}**${key.slice(-leftright)}`;
    };

    return (
        <UserContext.Provider value={{ publicKey, setPublicKey, userInfo, setUserInfo, fetchUserInfo, isModalOpen, openModal, closeModal, shortenPublicKey }}>
            {children}
        </UserContext.Provider>
    );
};
