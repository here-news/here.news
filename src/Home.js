import React, { useEffect, useState } from 'react';
import { useUser } from './UserContext';
import { Container, Navbar } from 'react-bootstrap';
import NewsColossal from './NewsColossal';
import Footer from './Footer';
import './bootstrap.min.css';
import './Home.css'; // Import your custom styles

const Home = () => {
    const { publicKey, userInfo } = useUser() || {};
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // We're no longer using the old story fetching for the home page
    // Now just loading minimal data for our new colossal UI
    
    useEffect(() => {
        // Just set loading to false since our NewsColossal component handles its own loading
        setLoading(false);
        
        // Reset scroll when component mounts - do this explicitly for both window and body
        window.scrollTo(0, 0);
        document.body.scrollTop = 0; // For Safari compatibility
        
        // Reset any transform or positioning on body that might be lingering
        document.body.style.transform = 'none';
        document.body.style.position = '';
        document.body.style.top = '0';
        
        // Also ensure the body has the correct class
        document.body.classList.add('fixed-layout');
    }, []);

    return (
        <>
            {/* New Colossal News UI */}
            <div className="colossal-section mb-5">
                <NewsColossal />
            </div>
            <Footer isMobile={isMobile} />
        </>
    );
}

export default Home;
