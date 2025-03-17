import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ProfileWidget from './ProfileWidget';
import './Header.css';  

const Header = ({ searchQuery, setSearchQuery }) => {
    const handleSearchChange = (e) => {
        if (setSearchQuery) {
            setSearchQuery(e.target.value);
        }
    };

    return (
        <header className="header">
            <div className="container">
                <div className="header-left">
                    <Link to="/" className="logo">
                        <img src="/static/logo.svg" alt="Logo" />
                    </Link>
                    <span style={{color:'grey', padding:'0 10px'}}> Balanced Intelligence</span>
                </div>
                <div className="header-center">
                    <div className="header-search-bar">
                        <span className="search-icon">🔍</span>
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
