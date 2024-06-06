import React from 'react';
import { Link } from 'react-router-dom';
import ProfileWidget from './ProfileWidget';
import './Header.css'; // Create this CSS file for styling

const Header = () => {
    return (
        <header className="header">
            <div className="container">
                <div className="header-left">
                    <Link to="/" className="logo">
                        <img src="/static/logo.svg" alt="Logo" />
                    </Link>
                    <span style={{ color: 'grey' }}>Stories from Intelligence and for Wisdom</span>
                </div>
                <div className="header-right">
                    <ProfileWidget />
                </div>
            </div>
        </header>
    );
};

export default Header;
