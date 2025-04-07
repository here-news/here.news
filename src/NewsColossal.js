import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import NewsColossalMobile from './NewsColossalMobile';
import NewsColossalDesktop from './NewsColossalDesktop';
import { useNewsData } from './hooks/useNewsData';
import './NewsColossal.css';

// Main component
const NewsColossal = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showBottomSearch, setShowBottomSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    news, 
    isLoading, 
    networkError, 
    isLoadingMore, 
    retryCount,
    fetchTopNews,
    loadMoreNews,
    setRetryCount 
  } = useNewsData();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobileView = window.innerWidth <= 768;
      setIsMobile(mobileView);
      document.body.classList.toggle('mobile-view', mobileView);
      document.body.classList.toggle('desktop-view', !mobileView);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('mobile-view', 'desktop-view');
    };
  }, []);

  // Card navigation
  const handleCardClick = (uuid) => navigate(`/news/${uuid}`);

  // Search query handler
  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  return (
    <>
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <div className="news-colossal-container">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}
        
        {networkError && (
          <div className="network-error-banner">
            <div className="error-icon">{navigator.onLine ? '⚠️' : '📶'}</div>
            <div className="error-message">{networkError}</div>
            <button 
              className="retry-button" 
              onClick={() => {
                setRetryCount(0);
                fetchTopNews();
              }}
            >
              Retry
            </button>
          </div>
        )}
        
        {isMobile ? (
          <NewsColossalMobile 
            news={news}
            handleCardClick={handleCardClick}
          />
        ) : (
          <NewsColossalDesktop 
            news={news}
            handleCardClick={handleCardClick}
            showBottomSearch={showBottomSearch}
            setShowBottomSearch={setShowBottomSearch}
            searchQuery={searchQuery}
            handleSearchChange={handleSearchChange}
            isLoadingMore={isLoadingMore}
            loadMoreNews={loadMoreNews}
          />
        )}
      </div>
      <Footer isMobile={isMobile} />
    </>
  );
};

export default NewsColossal;