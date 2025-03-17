import React from 'react';
import './Footer.css';

const Footer = ({ isMobile }) => {
    // Don't render footer on mobile to save space
    if (isMobile) {
        return null;
    }

    return (
        <footer className="footer">
            <div className="container">
                <p>© 2025 Balanced Intelligence. All rights reserved.</p>
                <p>Helping you navigate news with context and perspective</p>
            </div>
        </footer>
    );
};

export default Footer;