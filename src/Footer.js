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
                <p>(c) 2025 Quanta Intelligence. Some rights reserved. Follow Us on Nostr, Telegream and Signal.</p>
            </div>
        </footer>
    );
};

export default Footer;