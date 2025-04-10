import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileWidget from './ProfileWidget';
import './Header.css';  

const Header = ({ searchQuery, setSearchQuery }) => {
    const navigate = useNavigate();
    
    // Ultra-robust click handler with multiple fallbacks
    const goToHome = (e) => {
        // Prevent default behavior to ensure our handler runs
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        console.log("Logo clicked, attempting navigation to home");
        
        try {
            // Try React Router navigation first
            navigate('/');
            console.log("React Router navigation executed");
            
            // Set a fallback in case React Router fails silently
            setTimeout(() => {
                // Check if we're not on the home page
                if (window.location.pathname !== '/' && window.location.pathname !== '') {
                    console.log("Fallback: Using window.location for navigation");
                    window.location.href = '/';
                }
            }, 100);
        } catch (error) {
            console.error("Navigation error:", error);
            
            // Direct fallback if React Router throws an error
            window.location.href = '/';
        }
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
                    {/* Logo container with separate invisible touch button for mobile */}
                    <div className="logo-container">
                        {/* Hidden touch-friendly anchor that overlays the logo on mobile */}
                        <a 
                            href="/"
                            className="logo-mobile-touch-button" 
                            onClick={goToHome}
                            onTouchEnd={() => window.location.href = '/'}
                            aria-label="Go to homepage"
                        ></a>
                        
                        {/* Regular logo link */}
                        <a 
                            href="/"
                            className="logo"
                            onClick={goToHome}
                            aria-label="Go to homepage"
                        >
                            <img src="/static/hn2_logo.svg" alt="Logo" />
                            <span className="logo-text desktop-only">HƎRE</span>
                        </a>
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
