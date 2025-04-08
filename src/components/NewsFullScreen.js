import React, { useState, useRef, useEffect } from 'react';
import getFaviconUrl from '../util';
import Header from '../Header';
import Footer from '../Footer';
import MiniPriceChart from './MiniPriceChart';

const NewsFullScreen = ({ news, onClose, isMobile }) => {
  const [isPulling, setIsPulling] = useState(false);
  const fullscreenRef = useRef(null);
  
  useEffect(() => {
    if (isMobile && fullscreenRef.current) {
      const handlePull = (e) => {
        if (fullscreenRef.current.scrollTop <= 0) {
          setIsPulling(true);
        } else {
          setIsPulling(false);
        }
      };
      
      fullscreenRef.current.addEventListener('scroll', handlePull);
      return () => {
        if (fullscreenRef.current) {
          fullscreenRef.current.removeEventListener('scroll', handlePull);
        }
      };
    }
  }, [isMobile]);
  
  if (!news) return null;

  const trendingArrow = news.trending === 'up' ? '↑' : news.trending === 'down' ? '↓' : '→';
  const trendingClass = `trending-${news.trending}`;
  
  const handleTradingAction = (action) => {
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    console.log('Trading action:', action);
  };

  return (
    <>
      <Header />
      <div 
        className={`news-fullscreen ${isPulling ? 'pulling' : ''}`}
        ref={fullscreenRef}
      >
      
      <div className="fullscreen-close-button">
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      {isMobile ? (
        <div className="fullscreen-content">
          <section className="fullscreen-section">
            <div className="fullscreen-image">
              <img src={news.preview} alt={news.title} onError={(e) => e.target.src = '/static/3d.webp'} />
            </div>
            <div className="fullscreen-source">
              <img 
                src={getFaviconUrl(news.canonical, 24)} 
                alt={news.source} 
                className="source-favicon"
                width="24"
                height="24"
                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              />
              <span>{news.source}</span>
              <span className={`genre-badge genre-${news.genre ? news.genre.toLowerCase().replace(/\s+|&/g, '-') : 'news'}`}>{news.genre}</span>
              <span className="publish-date">Published: {new Date(news.pub_time).toLocaleDateString()}</span>
              <span className="author">By {news.author}</span>
            </div>
            <h1 className="fullscreen-title">{news.title}</h1>
            <p className="fullscreen-summary">{news.summary}</p>
            
            <div className="read-original">
              <a href={news.canonical} target="_blank" rel="noopener noreferrer">
                Read Original Article
              </a>
            </div>
          </section>
          
          <section className="fullscreen-section trading-only-section">
            <div className="trading-section">
              <h3>Content Trading</h3>
              <div className="trading-stats">
                <div className="trading-stat" style={{ display: 'flex', alignItems: 'center' }}>
                  <div>
                    <span className="stat-label">Current Value:</span>
                    <span className={`stat-value ${trendingClass}`}>${news.current_value} {trendingArrow}</span>
                  </div>
                  <MiniPriceChart 
                    priceHistory={news.price_history} 
                    percentChange={news.percent_change_24h}
                    width={80}
                    height={40}
                  />
                </div>
                <div className="trading-stat">
                  <span className="stat-label">Active Traders:</span>
                  <span className="stat-value">{news.traders}</span>
                </div>
              </div>
              <div className="trading-actions">
                <button 
                  className="trading-action long"
                  onClick={() => handleTradingAction('long')}
                >
                  Long Position
                </button>
                <button 
                  className="trading-action short"
                  onClick={() => handleTradingAction('short')}
                >
                  Short Position
                </button>
                <input 
                  type="number" 
                  className="shares-input" 
                  placeholder="Shares" 
                  min="1" 
                  step="1" 
                />
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="fullscreen-content">
          <div className="fullscreen-image">
            <img src={news.preview} alt={news.title} onError={(e) => e.target.src = '/static/3d.webp'} />
          </div>
          <div className="fullscreen-source">
            <img 
              src={getFaviconUrl(news.canonical, 24)} 
              alt={news.source} 
              className="source-favicon"
              width="24"
              height="24"
              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
            />
            <span>{news.source}</span>
            <span className={`genre-badge genre-${news.genre ? news.genre.toLowerCase().replace(/\s+|&/g, '-') : 'news'}`}>{news.genre}</span>
            <span className="publish-date">Published: {new Date(news.pub_time).toLocaleDateString()}</span>
            <span className="author">By {news.author}</span>
          </div>
          <h1 className="fullscreen-title">{news.title}</h1>
          <p className="fullscreen-summary">{news.summary}</p>
          
          <div className="trading-section">
            <h3>Content Trading</h3>
            <div className="trading-stats">
              <div className="trading-stat" style={{ display: 'flex', alignItems: 'center' }}>
                <div>
                  <span className="stat-label">Current Value:</span>
                  <span className={`stat-value ${trendingClass}`}>${news.current_value} {trendingArrow}</span>
                </div>
                <MiniPriceChart 
                  priceHistory={news.price_history} 
                  percentChange={news.percent_change_24h}
                  width={80}
                  height={40}
                />
              </div>
              <div className="trading-stat">
                <span className="stat-label">Active Traders:</span>
                <span className="stat-value">{news.traders}</span>
              </div>
            </div>
            <div className="trading-actions">
              <button 
                className="trading-action long"
                onClick={() => handleTradingAction('long')}
              >
                Long Position
              </button>
              <button 
                className="trading-action short"
                onClick={() => handleTradingAction('short')}
              >
                Short Position
              </button>
              <input type="number" className="shares-input" placeholder="Shares" min="1" step="1" />
            </div>
          </div>
          
          <div className="read-original">
            <a href={news.canonical} target="_blank" rel="noopener noreferrer">
              Read Original Article
            </a>
          </div>
        </div>
      )}
      </div>
      <Footer isMobile={isMobile} />
    </>
  );
};

export default NewsFullScreen;
