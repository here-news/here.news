import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { useNavigate } from 'react-router-dom';
import Login from './Login';

const ProfileWidget = () => {
    const { 
        publicKey, 
        userInfo, 
        isLoading, 
        logout, 
        isModalOpen,
        openModal, 
        shortenPublicKey 
    } = useUser();
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const navigate = useNavigate();
    
    // Check if user is authenticated
    const isAuthenticated = Boolean(publicKey);

    // Toggle dropdown menu
    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };
    
    // Navigate to profile sections
    const gotoProfile = (section) => () => {
        navigate(`/profile/${section}`);
        setIsDropdownOpen(false);
    };
    
    // Handle logout
    const handleLogout = () => {
        logout();
        setIsDropdownOpen(false);
    };
    
    // Get avatar from user info or local storage
    const avatarUrl = userInfo?.avatar || localStorage.getItem('avatarUrlSmall');
    
    // Get display name
    const displayName = userInfo?.name || shortenPublicKey(publicKey, 3);
    
    // Format balance for display
    const displayBalance = userInfo?.balance !== undefined ? userInfo.balance : 0;
    
    // Handle login button click with enhanced logging
    const handleLoginClick = (event) => {
        // Prevent any default behavior or event bubbling
        event.preventDefault();
        event.stopPropagation();
        
        console.log('Login button clicked');
        console.log('Current modal state before opening:', isModalOpen);
        openModal();
        
        // Check if state changed immediately (it won't due to React's state updates)
        console.log('Current modal state right after openModal():', isModalOpen);
        
        // We'll see the actual change in the next render cycle
        setTimeout(() => {
            console.log('Modal state after timeout:', isModalOpen);
        }, 0);
    };

    return (
        <div className="user-profile">
            {/* User not logged in */}
            {!isAuthenticated ? (
                <button 
                    className="login-button" 
                    onClick={handleLoginClick}
                    disabled={isLoading}
                >
                    {isLoading ? 'Loading...' : 'Login / Register'}
                </button>
            ) : (
                /* User logged in */
                <div className="user-info">
                    {/* Spices/Balance display */}
                    <div className="user-balance">
                        <span className="balance-icon">✨</span>
                        <span className="balance-amount">{displayBalance}</span>
                    </div>
                    
                    {/* User avatar and menu */}
                    <div 
                        onClick={toggleDropdown} 
                        className="user-avatar-container"
                    >
                        {avatarUrl ? (
                            <img 
                                src={avatarUrl} 
                                alt={displayName} 
                                className="user-avatar" 
                            />
                        ) : (
                            <div className="avatar-placeholder">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        
                        <span className="user-name">{displayName}</span>
                        
                        {/* Dropdown menu */}
                        {isDropdownOpen && (
                            <div className="profile-dropdown-menu">
                                <div className="menu-header">
                                    <div className="user-public-key">
                                        {shortenPublicKey(publicKey, 6)}
                                    </div>
                                </div>
                                
                                <div className="menu-items">
                                    <button onClick={gotoProfile('')} className="menu-item">
                                        <span className="menu-icon">👤</span> Profile
                                    </button>
                                    
                                    <button onClick={gotoProfile('spices')} className="menu-item">
                                        <span className="menu-icon">✨</span> Spices
                                    </button>
                                    
                                    <button onClick={gotoProfile('stories')} className="menu-item">
                                        <span className="menu-icon">📰</span> Stories
                                    </button>
                                    
                                    <button onClick={gotoProfile('settings')} className="menu-item">
                                        <span className="menu-icon">⚙️</span> Settings
                                    </button>
                                    
                                    <div className="menu-divider"></div>
                                    
                                    <button onClick={handleLogout} className="menu-item logout">
                                        <span className="menu-icon">🚪</span> Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Login modal component - always render it but let its internal logic handle visibility */}
            <Login />
            {/* Debug element to show modal state */}
            <div style={{ display: 'none' }}>Modal state: {isModalOpen ? 'open' : 'closed'}</div>
        </div>
    );
};

export default ProfileWidget;