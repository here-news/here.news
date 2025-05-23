import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileWidget from './ProfileWidget';
import './Header.css';  

const Header = ({ searchQuery, setSearchQuery }) => {
    const navigate = useNavigate();
    const [eFlipped, setEFlipped] = useState(false);
    
    // Enhanced navigation handler with debug logging
    const goToHome = (e) => {
        // Prevent default behavior to ensure our handler runs
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        console.log("Logo clicked, attempting navigation to home");
        
        // Force scroll to top immediately
        window.scrollTo(0, 0);
        
        // Reset any transform or positioning on body
        document.body.style.transform = 'none';
        document.body.style.position = '';
        document.body.style.top = '0px';
        
        // Remove any scroll position preservation classes
        document.body.classList.remove('scroll-locked');
        
        // Force immediate navigation 
        navigate('/');
        
        // Additional scroll reset after a tiny delay to ensure it takes effect
        setTimeout(() => {
            console.log("Forcing additional scroll reset");
            window.scrollTo(0, 0);
            
            // As a last resort, reload the page if we're still not at the homepage
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

    const handleLogoHover = () => setEFlipped(!eFlipped);

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
                            <span 
                                className="logo-text desktop-only"
                                onMouseEnter={handleLogoHover}
                            >
                                H<span className="flip-e" style={{ transform: eFlipped ? "scaleX(-1)" : "none" }}>E</span>
                                R<span className="flip-e" style={{ transform: eFlipped ? "scaleX(-1)" : "none" }}>E</span>
                            </span>
                        </div>
                    </div>
                    <span className="slogan-text desktop-only">Truth Gains</span>
                </div>
                <div className="header-center">
                    <div className="header-search-bar">
                        <span className="search-icon"><span role="img" aria-label="search">🔍</span></span>
                        <input
                            type="text"
                            placeholder="Explore, Share and Weigh In ..."
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
