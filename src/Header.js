import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileWidget from './ProfileWidget';
import './Header.css';  

const Header = ({ searchQuery, setSearchQuery }) => {
    const navigate = useNavigate();
    
    // Simple direct click handler
    const goToHome = () => {
        navigate('/');
        console.log("Navigating to home");
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
                    {/* Replaced Link with simple div for testing */}
                    <div 
                        className="logo"
                        onClick={goToHome}
                    >
                        <img src="/static/hn2_logo.svg" alt="Logo" />
                        <span className="logo-text desktop-only">HƎRE</span>
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
