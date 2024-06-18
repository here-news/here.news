import React from 'react';
import { Link } from 'react-router-dom';
import ProfileWidget from './ProfileWidget';
import './Header.css';  

const Header = () => {
    return (
        <header className="header">
            <div className="container">
                <div className="header-left">
                    <Link to="/" className="logo">
                        <img src="/static/logo.svg" alt="Logo" />
                    </Link>
                    <span style={{color:'grey', padding:'0 10px'}}> Balanced Intelligence</span>
                </div>
                <div className="header-right">
                    <ProfileWidget />
                </div>
            </div>
        </header>
    );
};

export default Header;
