import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileWidget from './ProfileWidget';
import './Header.css';  

const Header = ({ searchQuery, setSearchQuery }) => {
    const navigate = useNavigate();
    
    // Enhanced navigation handler with debug logging
    const goToHome = (e) => {
        // Prevent default behavior to ensure our handler runs
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        console.log("Logo clicked, attempting navigation to home");
        console.log("Event type:", e.type);
        console.log("Event target:", e.target);
        
        // Force immediate navigation 
        navigate('/');
        
        // Additional failsafe with a tiny delay
        setTimeout(() => {
            if (window.location.pathname !== '/') {
                console.log("Using direct location change as backup");
                window.location.href = '/';
            }
        }, 50);
    };
    
    const handleSearchChange = (e) => {
        if (setSearchQuery) {
            setSearchQuery(e.target.value);
        }
    };

    return (
        <header className="header">
            <div className="container">
                <div className="header-left">
                    <div className="logo-container" onClick={goToHome}>
                        {/* Mobile touch button for extra touch area */}
                        <div 
                            className="logo-mobile-touch-button" 
                            onClick={goToHome}
                            onTouchEnd={goToHome}
                        ></div>
                        
                        {/* Logo with enhanced clickability */}
                        <div 
                            className="logo"
                            onClick={goToHome}
                            onTouchEnd={goToHome}
                            style={{cursor: 'pointer'}}
                        >
                            {/* Apply direct event handlers to the image itself */}
                            <img 
                                src="/static/hn2_logo.svg" 
                                alt="Logo" 
                                onClick={goToHome}
                                onTouchEnd={goToHome}
                                style={{cursor: 'pointer'}}
                            />
                            <span className="logo-text desktop-only">HƎRE</span>
                        </div>
                    </div>
                    <span className="slogan-text desktop-only">Truth Gains</span>
                </div>
                <div className="header-center">
                    <div className="header-search-bar">
                        <span className="search-icon"><span role="img" aria-label="search">🔍</span></span>
                        <input
                            type="text"
                            placeholder="Search news..."
                            value={searchQuery || ''}
                            onChange={handleSearchChange}
                        />
                    </div>
                </div>
                <div className="header-right">
                    <ProfileWidget />
                </div>
            </div>
        </header>
    );
};

export default Header;
