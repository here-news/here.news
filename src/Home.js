import React, { useEffect, useState } from 'react';
import { useUser } from './UserContext';
import serviceUrl from './config';
import { Container, Row, Col, Spinner, Navbar } from 'react-bootstrap';
import './bootstrap.min.css';
import './Home.css'; // Import your custom styles

const Home = () => {
    const { publicKey, userInfo } = useUser() || {};
    const [loading, setLoading] = useState(true);
    const [topStories, setTopStories] = useState([]);
    const [sideStories, setSideStories] = useState([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
    const [allCategoriesLoaded, setAllCategoriesLoaded] = useState(false);

    const versatileCategories = ['emerging', 'regular', 'monument'];

    useEffect(() => {
        fetchTopStories();
        const interval = setInterval(fetchTopStories, 111000);
        return () => clearInterval(interval);
    }, []);

    const fetchTopStories = () => {
        setLoading(true);
        fetch(`${serviceUrl}/topstories?range=2h`)
            .then(response => response.json())
            .then(data => {
                setTopStories([data[0]]);
                setSideStories(data.slice(1));
                setLoading(false);
                setAllCategoriesLoaded(false);
                setCurrentCategoryIndex(0);
            })
            .catch(error => {
                console.error('Error fetching top stories:', error);
                setLoading(false);
            });
    };

    const fetchMoreStories = (category) => {
        if (isLoadingMore) return;
        setIsLoadingMore(true);
        fetch(`${serviceUrl}/features/${category}`)
            .then(response => response.json())
            .then(stories => {
                setSideStories(prevStories => [...prevStories, ...stories.slice(0, 4)]);
                setIsLoadingMore(false);
                if (currentCategoryIndex < versatileCategories.length - 1) {
                    setCurrentCategoryIndex(currentCategoryIndex + 1);
                } else {
                    setAllCategoriesLoaded(true);
                }
            })
            .catch(error => {
                console.error('Error fetching more stories:', error);
                setIsLoadingMore(false);
            });
    };

    useEffect(() => {
        const handleScroll = () => {
            if (allCategoriesLoaded) return;
            const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
            if (nearBottom && !isLoadingMore) {
                fetchMoreStories(versatileCategories[currentCategoryIndex]);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [currentCategoryIndex, isLoadingMore, allCategoriesLoaded]);

    return (
        <>
            <Navbar bg="light" className="justify-content-center">
                <Navbar.Brand>
                    <div className="d-flex align-items-center">
                        <span className="ml-2"><b>NEWS&nbsp;&nbsp;</b></span>
                        <img src="/static/logo.svg" alt="Logo" id="top-logo" className="navbar-brand" />
                        <span className="ml-2"><b>HERE</b></span>
                    </div>
                </Navbar.Brand>
            </Navbar>
            <Container className="mt-4">
                <div className="card">
                    <div className="card-body">
                        {loading ? (
                            <div>Loading...</div>
                        ) : (
                            <Row id="stories-container">
                                {topStories.map(story => (
                                    <Col md={9} className="mb-4" key={story.uuid}>
                                        <div className="top-main-story">
                                            <div className="image-container">
                                                <div className="top-story-title">
                                                    <a href={`/story/${story.uuid}?ver=${story.version}`}>
                                                        <h1>{story.title}</h1>
                                                    </a>
                                                </div>
                                                <img src={story.preview} onError={(e) => e.target.src = '/static/bubble.webp'} alt={story.aboutness} />
                                            </div>
                                            <div className="top-story-content">
                                                <p><b>{story.story.substring(0, 240)}...</b></p>
                                            </div>
                                        </div>
                                    </Col>
                                ))}
                                {sideStories.map((story, index) => {
                                    const cardType = ['hot', 'fashion', 'value', 'solid'][Math.floor(Math.random() * 4)];
                                    return (
                                        <Col md={3} className="mb-4" key={story.uuid}>
                                            <div className={`story-card ${cardType} h-100`}>
                                                <a href={`/story/${story.uuid}`}>
                                                    <img className="card-img-top" src={story.preview || '/static/3d.webp'} onError={(e) => e.target.src = '/static/bubble.webp'} alt={story.aboutness} loading="lazy" />
                                                </a>
                                                <div className="card-body">
                                                    <a href={`/story/${story.uuid}`} className="text-dark text-decoration-none">
                                                        <h5 className="card-title"><b>{story.title}</b></h5>
                                                    </a>
                                                    {index === 0 && <p>{story.story.substring(0, 120)}...</p>}
                                                </div>
                                            </div>
                                        </Col>
                                    );
                                })}
                            </Row>
                        )}
                    </div>
                </div>
                {isLoadingMore && (
                    <div id="loading-more" className="text-center">
                        <Spinner animation="border" variant="primary" />
                    </div>
                )}
            </Container>
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
