import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import serviceUrl from './config';
import Header from './Header';
import { apiRequest } from './services/api';
import './Profile.css';

// Set to true for development debugging, false for production
const DEBUG_MODE = false;

// Helper function to conditionally log messages
const debugLog = (...args) => {
    if (DEBUG_MODE) console.log(...args);
};

const Profile = () => {
    // Update to use the correct parameter name matching the route in App.js
    const { tab = 'profile' } = useParams(); // Get the tab parameter from URL with a default of 'profile'
    const section = tab; // Keep 'section' for compatibility with existing code
    const navigate = useNavigate();
    const { userInfo, loading, error, updateUserBalance } = useUser();
    const [isDepositing, setIsDepositing] = useState(false);
    const [localBalance, setLocalBalance] = useState(0);
    const [hasLocalBalance, setHasLocalBalance] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    // Function to show a notification
    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, 5000);
    };

    useEffect(() => {
        if (!loading && !userInfo) {
            navigate('/');
        }
    }, [loading, userInfo, navigate]);

    // Log the current section to help with debugging
    useEffect(() => {
        debugLog('Current profile section:', section);
    }, [section]);

    const handleNavigation = (section) => {
        navigate(`/profile/${section}`);
    };

    // Function to handle deposit
    const handleDeposit = async () => {
        if (!userInfo) {
            console.error("Cannot deposit: User info not available");
            showNotification("User information not available. Please try logging in again.", "error");
            return;
        }
        
        // Get public key from userInfo
        const userPublicKey = userInfo.public_key || userInfo.publicKey || null;
        
        if (!userPublicKey) {
            console.error("Cannot deposit: User public key not available");
            showNotification("Your account information is incomplete. Please try logging in again.", "error");
            return;
        }

        try {
            setIsDepositing(true);
            debugLog("Depositing for user with key:", userPublicKey);
            
            // Use apiRequest with JWT authentication for deposit
            const response = await apiRequest(`${serviceUrl}/me/deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: 10
                })
            }, true); // Mark as protected for JWT

            if (response.ok) {
                const data = await response.json();
                debugLog("Deposit successful - full response data:", data);
                
                // The API returns balance inside a nested object
                if (data && data.balance) {
                    const newBalance = typeof data.balance === 'number' 
                        ? data.balance 
                        : parseFloat(data.balance);
                        
                    setLocalBalance(newBalance);
                    setHasLocalBalance(true);
                    
                    // Update global user balance
                    if (updateUserBalance) {
                        updateUserBalance(newBalance);
                    }
                    
                    showNotification(`Successfully deposited $10. New balance: $${newBalance.toFixed(2)}.`, "success");
                } 
                // Alternatively check for standalone quote_balance field
                else if (data && data.quote_balance) {
                    const newBalance = typeof data.quote_balance === 'number' 
                        ? data.quote_balance 
                        : parseFloat(data.quote_balance);
                        
                    setLocalBalance(newBalance);
                    setHasLocalBalance(true);
                    
                    // Update global user balance
                    if (updateUserBalance) {
                        updateUserBalance(newBalance);
                    }
                    
                    showNotification(`Successfully deposited $10. New balance: $${newBalance.toFixed(2)}.`, "success");
                } else {
                    console.error("Could not detect balance in response:", data);
                    showNotification("Deposit successful, but couldn't retrieve your new balance.", "warning");
                }
            } else {
                const errorText = await response.text();
                console.error("Deposit failed:", errorText);
                showNotification("Failed to deposit funds. Please try again later.", "error");
            }
        } catch (error) {
            console.error("Error during deposit:", error);
            showNotification("An error occurred while processing your deposit.", "error");
        } finally {
            setIsDepositing(false);
        }
    };

    // Format balance as a proper number - prioritize local balance, then quote_balance
    const formattedBalance = useMemo(() => {
        // First check if we have a local balance (which is most up-to-date)
        if (hasLocalBalance) {
            debugLog("Using local balance:", localBalance);
            if (isNaN(localBalance)) {
                console.error("Local balance is NaN, using 0");
                return 0;
            }
            return localBalance;
        }
        
        if (!userInfo) return 0;
        
        // Then check for quote_balance in userInfo
        if (userInfo.quote_balance !== undefined) {
            const balanceNum = Number(userInfo.quote_balance);
            debugLog("Using quote_balance from userInfo:", userInfo.quote_balance);
            return !isNaN(balanceNum) ? balanceNum : 0;
        }
        
        // Fall back to balance if no quote_balance
        if (userInfo.balance !== undefined) {
            const balanceNum = Number(userInfo.balance);
            debugLog("Using balance from userInfo:", userInfo.balance);
            return !isNaN(balanceNum) ? balanceNum : 0;
        }
        
        return 0;
    }, [userInfo, localBalance, hasLocalBalance]);

    // Add a refresh function to manually update profile data
    const refreshUserProfile = async () => {
        if (!userInfo || !userInfo.public_key) return;
        
        try {
            // Use apiRequest with JWT authentication for fetching balance
            const response = await apiRequest(`${serviceUrl}/me/balance`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            }, true); // Mark as protected for JWT
            
            if (response.ok) {
                const data = await response.json();
                debugLog("Balance refresh data:", data);
                
                // Handle the balance response
                if (data && data.quote_balance !== undefined) {
                    const numBalance = Number(data.quote_balance);
                    debugLog("Setting local balance from balance refresh:", numBalance);
                    setLocalBalance(numBalance);
                    setHasLocalBalance(true);
                    
                    if (updateUserBalance) {
                        updateUserBalance(numBalance);
                    }
                    showNotification("Balance updated successfully.", "success");
                } else {
                    console.error("No valid balance found in balance response:", data);
                    showNotification("Couldn't retrieve your current balance.", "warning");
                }
            } else {
                console.error("Failed to refresh balance:", await response.text());
                showNotification("Failed to update balance information.", "error");
            }
        } catch (error) {
            console.error("Failed to refresh profile:", error);
            showNotification("Failed to update balance information.", "error");
        }
    };
    
    // Refresh balance when the wallet section is loaded
    useEffect(() => {
        if (section === 'wallet') {
            debugLog("Wallet section loaded, refreshing profile data");
            refreshUserProfile();
        }
    }, [section]);

    // Loading, error and empty states
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!userInfo) return null;

    return (
        <>
            <Header />
            
            {/* Notification component */}
            {notification.show && (
                <div className={`notification-toast ${notification.type}`}>
                    <div className="notification-content">
                        <p>{notification.message}</p>
                        <button 
                            className="notification-close" 
                            onClick={() => setNotification({ show: false, message: '', type: 'success' })}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
            
            <div className="container mt-4">
                <div className="card">
                    <div className="card-body">
                        <div className="profile-container">
                            <div className="sidebar">
                                <ul>
                                    <li className={section === 'profile' ? 'active' : ''} onClick={() => handleNavigation('profile')}>Profile</li>
                                    <li className={section === 'wallet' ? 'active' : ''} onClick={() => handleNavigation('wallet')}>
                                        Wallet & Portfolio <span role="img" aria-label="sparkles">✨</span>
                                    </li>
                                    <li className={section === 'activities' ? 'active' : ''} onClick={() => handleNavigation('activities')}>Activities</li>
                                    <li className={section === 'settings' ? 'active' : ''} onClick={() => handleNavigation('settings')}>Settings</li>
                                </ul>
                            </div>
                            <div className="main-content">
                                {section === 'profile' && (
                                    <div>
                                        <h2>Profile</h2>
                                        <div>
                                            <img className="avatar-login" src={userInfo.avatar || `${serviceUrl}/avatar/${userInfo.public_key}?format=png&sz=32`} alt="Profile" />
                                            <p>ID: {userInfo.public_key}</p>
                                            <p>Name: {userInfo.name}</p>
                                            <p>Email: {userInfo.email}</p>
                                            {/* Add a form to update profile details */}
                                        </div>
                                    </div>
                                )}
                                {section === 'wallet' && (
                                    <div>
                                        <h2>Wallet & Portfolio</h2>
                                        <hr />
                                        <div className="wallet-balance-section">
                                            <h3>Balance: <b>{isNaN(formattedBalance) ? '0.00' : formattedBalance.toFixed(2)} </b>USD</h3>
                                            {hasLocalBalance && (
                                                <p><small>(Updated: {new Date().toLocaleTimeString()})</small></p>
                                            )}
                                            <p><small>(* currency used for activities in the community)</small></p>
                                            
                                            <div className="wallet-actions mt-3">
                                                <button 
                                                    className="btn btn-primary" 
                                                    onClick={handleDeposit} 
                                                    disabled={isDepositing}
                                                >
                                                    {isDepositing ? 'Processing...' : 'Deposit $10'}
                                                </button>
                                                <button 
                                                    className="btn btn-outline-secondary ms-2" 
                                                    onClick={refreshUserProfile}
                                                >
                                                    Refresh Balance
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <hr />
                                        <h3>Transaction History</h3>
                                        {userInfo.transactions && userInfo.transactions.length > 0 ? (
                                            <ul className="transaction-list">
                                                {userInfo.transactions.map((transaction, index) => (
                                                    <li key={index}>{transaction.description}: {transaction.amount} USD</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p>No transactions yet.</p>
                                        )}
                                    </div>
                                )}
                                {section === 'activities' && (
                                    <div>
                                        <h2>Activities</h2>
                                        {/* Display stories the user has engaged with */}
                                    </div>
                                )}
                                {section === 'settings' && (
                                    <div>
                                        <h2>Settings</h2>
                                        {/* Display user settings and privacy options */}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;
