import React, { useEffect, useState } from 'react';
import { useUser } from './UserContext';
import { Container, Navbar } from 'react-bootstrap';
import NewsColossal from './NewsColossal';
import './bootstrap.min.css';
import './Home.css'; // Import your custom styles

const Home = () => {
    const { publicKey, userInfo } = useUser() || {};
    const [loading, setLoading] = useState(true);

    // We're no longer using the old story fetching for the home page
    // Now just loading minimal data for our new colossal UI
    
    useEffect(() => {
        // Just set loading to false since our NewsColossal component handles its own loading
        setLoading(false);
    }, []);

    return (
        <>
            
            {/* New Colossal News UI */}
            <div className="colossal-section mb-5">
                <NewsColossal />
            </div>
            <footer className="footer bg-light mt-4">
                <Container className="text-center">
                    <p className="text-muted">More news? Follow our <a href="https://t.me/herestories">Telegram</a>, <a href="https://chat.openai.com/g/g-1twJGOowM-newstr-studio-ai-based-news-brain">GPT</a>, <a href="https://primal.net/p/npub1nnfvvadussrr3y6vh3rtee0urtaej4m0vpz4p2vhfvmak7n7hjrq2effs2">Nostr</a> channels.</p>
                    <span className="text-muted">(cc)2023 Newstr, Here.news. Some Rights Reserved.</span>
                </Container>
            </footer>
        </>
    );
};

export default Home;
