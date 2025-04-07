import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import getFaviconUrl from './util';
import serviceUrl from './config';
import Header from './Header';
import Footer from './Footer';
import './NewsColossal.css';
import { debugLog } from './utils/debugUtils';

// Mini price chart component to show price history
const MiniPriceChart = ({ priceHistory, percentChange, width = 40, height = 20 }) => {
  // Default empty array if no price history provided
  const data = priceHistory || [];
  
  // Check if we have price data
  if (!data || data.length === 0) {
    return null;
  }
  
  // Find min/max for scaling
  const minPrice = Math.min(...data);
  const maxPrice = Math.max(...data);
  const range = maxPrice - minPrice;
  
  // Determine color based on percent change
  const chartColor = parseFloat(percentChange) >= 0 ? '#28a745' : '#dc3545';
  
  // Calculate point coordinates
  const points = data.map((price, index) => {
    const x = (index / (data.length - 1)) * width;
    // Invert Y axis (SVG 0,0 is top-left)
    const y = height - ((price - minPrice) / (range || 1)) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div className="mini-chart-container">
      <svg width={width} height={height} className="mini-price-chart">
        <polyline
          points={points}
          fill="none"
          stroke={chartColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span className={`percent-change ${parseFloat(percentChange) >= 0 ? 'positive' : 'negative'}`}>
        {parseFloat(percentChange) >= 0 ? '+' : ''}{percentChange}%
      </span>
    </div>
  );
};

const NewsCard = React.forwardRef(({ news, isActive, onClick, style, isMobile, gridPosition, children }, ref) => {
  // Handle trading actions
  const handleLongPosition = (e) => {
    e.stopPropagation();
    // Provide haptic feedback
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };
  
  const handleShortPosition = (e) => {
    e.stopPropagation();
    // Provide haptic feedback
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };
  
  const handleCardClick = () => {
    onClick(news.uuid);
  };

  // Value indicator arrow based on trending direction
  const trendingArrow = news.trending === 'up' 
    ? '↑' 
    : news.trending === 'down' 
      ? '↓' 
      : '→';
  
  const trendingClass = `trending-${news.trending}`;
  
  // Generate CSS genre class
  const getGenreClass = () => {
    // Convert genre to lowercase and remove whitespace and special chars for CSS class
    let genre = news.genre ? news.genre.toLowerCase().replace(/\s+|&/g, '-') : 'news';
    return `genre-${genre}`;
  };
  
  // Base classes
  let baseClasses = ['news-card'];
  
  // Add position/active classes
  if (isActive) {
    baseClasses.push('active');
  }
  
  // Add desktop-specific classes
  if (!isMobile) {
    if (isActive) {
      baseClasses.push('desktop-active');
    }
    if (gridPosition) {
      baseClasses.push(`position-${gridPosition}`);
    }
  }
  
  // Add genre class
  baseClasses.push(getGenreClass());
  
  // Join all classes
  const cardClasses = baseClasses.join(' ');
  
  // Standard desktop card
  if (!isMobile) {
    return (
      <div 
        ref={ref}
        className={cardClasses} 
        onClick={handleCardClick} 
        style={style}
      >
        <div className="card-preview">
          <img src={news.preview} alt={news.title} onError={(e) => e.target.src = '/static/3d.webp'} />
        </div>
        <div className="card-content">
          <div className="card-source">
            <img 
              src={getFaviconUrl(news.canonical, 16)} 
              alt={news.source} 
              className="source-favicon"
              width="16"
              height="16"
              style={{ width: '16px', height: '16px', objectFit: 'contain' }}
            />
            <span className="source-name">{news.source}</span>
            <span className={`genre-badge ${getGenreClass()}`}>{news.genre}</span>
          </div>
          <h2 className="card-title">{news.title}</h2>
          <p className="card-summary">{news.summary}</p>
        </div>
        
        {/* Trading section for desktop */}
        <div className="card-trading-section">
          <div className="card-trading-info">
            <div className={`current-value ${trendingClass}`}>
              ${news.current_value} {trendingArrow}
            </div>
            <MiniPriceChart 
              priceHistory={news.price_history} 
              percentChange={news.percent_change_24h}
              width={50}
              height={20}
            />
          </div>
          <div className="trading-buttons">
            <button className="trading-button long" onClick={handleLongPosition}>
              LONG
            </button>
            <button className="trading-button short" onClick={handleShortPosition}>
              SHORT
            </button>
          </div>
        </div>
        
        {children}
      </div>
    );
  }
  
  // For mobile card with vertical layout
  return (
    <div 
      ref={ref}
      className={cardClasses} 
      onClick={handleCardClick} 
      style={style}
    >
      <div className="card-preview">
        <img src={news.preview} alt={news.title} onError={(e) => e.target.src = '/static/3d.webp'} />
      </div>
      <div className="card-content">
        <div className="card-source">
          <img 
            src={getFaviconUrl(news.canonical, 16)} 
            alt={news.source}
            className="source-favicon"
            width="16"
            height="16"
            style={{ width: '16px', height: '16px', objectFit: 'contain' }}
          />
          <span className="source-name">{news.source}</span>
          <span className={`genre-badge ${getGenreClass()}`}>{news.genre}</span>
        </div>
        <h2 className="card-title">{news.title}</h2>
        <p className="card-summary">{news.summary}</p>
        
      </div>
      
      {/* Trading actions directly on the card */}
      {isMobile && isActive && (
        <div className="card-trading-actions">
          <button className="trading-button long" onClick={handleLongPosition}>
            LONG
            <span className="trading-button-value">${news.current_value}</span>
          </button>
          <button className="trading-button short" onClick={handleShortPosition}>
            SHORT
            <span className="trading-button-value">${news.current_value}</span>
          </button>
        </div>
      )}
      
      {/* Add swipe hints or other child elements */}
      {children}
    </div>
  );
});

const NewsFullScreen = ({ news, onClose }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isMobile] = useState(window.innerWidth <= 768);
  const fullscreenRef = useRef(null);
  
  useEffect(() => {
    // For mobile, add special scrolling behavior
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

  // Value indicator arrow based on trending direction
  const trendingArrow = news.trending === 'up' 
    ? '↑' 
    : news.trending === 'down' 
      ? '↓' 
      : '→';
  
  const trendingClass = `trending-${news.trending}`;
  
  // Get category color for header
  const getCategoryColor = (genre) => {
    const colorMap = {
      'Science & Technology': 'linear-gradient(135deg, #4a148c 0%, #7c43bd 100%)',
      'Environment': 'linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)',
      'Economy': 'linear-gradient(135deg, #0d47a1 0%, #2196f3 100%)',
      'Health & Technology': 'linear-gradient(135deg, #b71c1c 0%, #f44336 100%)',
      'Archaeology': 'linear-gradient(135deg, #795548 0%, #a1887f 100%)',
      'Politics': 'linear-gradient(135deg, #880e4f 0%, #e91e63 100%)',
      'Culture': 'linear-gradient(135deg, #e65100 0%, #ff9800 100%)',
      'Sports': 'linear-gradient(135deg, #006064 0%, #00bcd4 100%)',
      'Entertainment': 'linear-gradient(135deg, #4a148c 0%, #9c27b0 100%)'
    };
    
    return colorMap[genre] || 'linear-gradient(135deg, #37474f 0%, #78909c 100%)';
  };
  
  // Provide haptic feedback when user taps Trading buttons
  const handleTradingAction = (action) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    console.log('Trading action:', action);
  };

  return (
    <>
      <Header />
      <div 
        className={`news-fullscreen ${isPulling ? 'pulling' : ''}`}
        ref={fullscreenRef}
      >
      {/* Pull-to-refresh indicator - only shown when pulling */}
      {isMobile && (
        <div className="pull-indicator">
          <span className="ticker-refresh">↻ Pull to refresh market data ↻</span>
        </div>
      )}
      
      {/* Just add a close button in the top-right corner */}
      <div className="fullscreen-close-button">
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      {isMobile ? (
        // Mobile layout with swipeable sections
        <div className="fullscreen-content">
          {/* Single section with article content */}
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
          
          {/* Trading section */}
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
        // Desktop layout (unchanged)
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

const NewsColossal = () => {
  // Initialize navigate function for routing
  const navigate = useNavigate();
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [news, setNews] = useState([]);
  const [fullScreenNews, setFullScreenNews] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLoading, setIsLoading] = useState(true);
  const [showBottomSearch, setShowBottomSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  
  // Fetch news from API
  const fetchTopNews = async () => {
    setIsLoading(true);
    
    try {
      // Use the topnews endpoint with cache buster
      const cacheBuster = new Date().getTime();
      
      // Simple fetch without credentials or special headers to avoid CORS issues
      const response = await fetch(`${serviceUrl}/topnews?range=2h&limit=9&_=${cacheBuster}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching news: ${response.status} ${response.statusText}`);
      }
      
      let data = await response.json();
      debugLog('Raw API response:', data);
      
      // Determine the structure of the response
      let fetchedNews = [];
      
      // Handle different response formats
      if (Array.isArray(data)) {
        // Response is already an array
        fetchedNews = data;
      } else if (data && typeof data === 'object') {
        // Response might be an object with nested data
        // Try common patterns for API responses
        if (Array.isArray(data.results)) {
          fetchedNews = data.results;
        } else if (Array.isArray(data.data)) {
          fetchedNews = data.data;
        } else if (Array.isArray(data.items)) {
          fetchedNews = data.items;
        } else if (Array.isArray(data.news)) {
          fetchedNews = data.news;
        } else {
          // If it's a single object, turn it into an array
          const keys = Object.keys(data).filter(key => key !== 'status' && key !== 'message');
          if (keys.length > 0 && data[keys[0]] && typeof data[keys[0]] === 'object') {
            // It might be a map of objects, try to convert to array
            fetchedNews = Object.values(data);
          } else {
            // If it's a single news item, wrap it in an array
            fetchedNews = [data];
          }
        }
      }
      
      debugLog('Processed news array:', fetchedNews);
      
      if (!Array.isArray(fetchedNews) || fetchedNews.length === 0) {
        throw new Error('Could not extract news array from API response');
      }
      
      // Add trading-related data where missing
      fetchedNews = fetchedNews.map(item => {
        // Only generate price history if it doesn't exist
        if (!item.price_history) {
          // Generate random price history for the chart
          const priceHistory = [];
          const trendBias = Math.random() > 0.5 ? 1 : -1; // Determine if trending up or down overall
          const initialPrice = (Math.random() * 3 + 0.5);
          let lastPrice = initialPrice;
          
          // Generate price points
          for (let i = 0; i < 24; i++) {
            const change = (Math.random() * 0.2 - 0.1) + (trendBias * 0.02);
            lastPrice = Math.max(0.1, lastPrice + change);
            priceHistory.push(lastPrice);
          }
          
          // Determine trending direction from last prices
          const finalPrice = priceHistory[priceHistory.length - 1];
          const previousPrice = priceHistory[priceHistory.length - 2] || initialPrice;
          const priceDiff = finalPrice - previousPrice;
          const trending = priceDiff > 0.05 ? 'up' : (priceDiff < -0.05 ? 'down' : 'stable');
          
          // Calculate 24hr percent change
          const percentChange = ((finalPrice - initialPrice) / initialPrice) * 100;
          
          // Only add fields that don't exist
          return {
            ...item,
            current_value: item.current_value || finalPrice.toFixed(2),
            trending: item.trending || trending,
            price_history: priceHistory,
            percent_change_24h: item.percent_change_24h || percentChange.toFixed(1)
          };
        }
        
        return item;
      });
      
      debugLog('Enhanced news with trading data:', fetchedNews);
      setNews(fetchedNews);
    } catch (error) {
      debugLog('Error fetching news:', error);
      // In production, handle error gracefully without mock data
      setNews([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch news details for a specific article
  const fetchNewsDetails = async (uuid) => {
    try {
      // Add cache buster to prevent caching
      const cacheBuster = new Date().getTime();
      const response = await fetch(`${serviceUrl}/news/${uuid}?_=${cacheBuster}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      debugLog('Raw news details from API:', data);
      
      // Handle different response formats
      let newsDetails = data;
      
      // If the response is nested, extract the actual news details
      if (data && typeof data === 'object') {
        if (data.data && typeof data.data === 'object') {
          newsDetails = data.data;
        } else if (data.results && typeof data.results === 'object') {
          newsDetails = data.results;
        } else if (data.news && typeof data.news === 'object') {
          newsDetails = data.news;
        }
      }
      
      debugLog('Processed news details:', newsDetails);
      
      if (!newsDetails || Object.keys(newsDetails).length === 0) {
        throw new Error('Empty news details returned');
      }
      
      // Add trading-related data with price history
      if (!newsDetails.price_history) {
        // Generate random price history for the chart
        const priceHistory = [];
        const trendBias = Math.random() > 0.5 ? 1 : -1; // Determine if trending up or down overall
        const initialPrice = (Math.random() * 3 + 0.5);
        let lastPrice = initialPrice;
        
        // Generate price points
        for (let i = 0; i < 24; i++) {
          const change = (Math.random() * 0.2 - 0.1) + (trendBias * 0.02);
          lastPrice = Math.max(0.1, lastPrice + change);
          priceHistory.push(lastPrice);
        }
        
        // Determine trending direction from last prices
        const finalPrice = priceHistory[priceHistory.length - 1];
        const previousPrice = priceHistory[priceHistory.length - 2] || initialPrice;
        const priceDiff = finalPrice - previousPrice;
        const trending = priceDiff > 0.05 ? 'up' : (priceDiff < -0.05 ? 'down' : 'stable');
        
        // Calculate 24hr percent change
        const percentChange = ((finalPrice - initialPrice) / initialPrice) * 100;
        
        return {
          ...newsDetails,
          current_value: newsDetails.current_value || finalPrice.toFixed(2),
          trending: newsDetails.trending || trending,
          price_history: priceHistory,
          percent_change_24h: newsDetails.percent_change_24h || percentChange.toFixed(1)
        };
      }
      
      return newsDetails;
    } catch (error) {
      debugLog(`Error fetching details for news ${uuid}:`, error);
      return null;
    }
  };
  
  // Track if data has been loaded to prevent multiple fetches
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Only fetch data once on initial component mount
  useEffect(() => {
    // Only fetch if we haven't loaded data yet
    if (!hasLoadedData && news.length === 0) {
      fetchTopNews()
        .then(() => {
          setHasLoadedData(true);
          debugLog('Data loaded successfully, marking as loaded');
        })
        .catch(error => {
          debugLog('Error in initial data fetch:', error);
          // Still mark as loaded to prevent constant retries
          setHasLoadedData(true);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate useEffect for mobile setup to avoid mixing concerns
  useEffect(() => {
    // Prevent default scrolling on mobile
    if (isMobile && containerRef.current) {
      containerRef.current.style.overscrollBehavior = 'none';
      containerRef.current.style.touchAction = 'none';
    }
    
    // Apply proper positioning to all cards on initial load
    const positionCards = () => {
      if (isMobile) {
        const allCards = document.querySelectorAll('.news-card');
        const activeCard = document.querySelector('.news-card.active');
        
        // Ensure all cards have proper fixed positioning
        allCards.forEach((card, index) => {
          const relativePosition = index - activeIndex;
          
          // Common styles for all cards
          card.style.position = 'fixed';
          card.style.top = '60px';
          card.style.left = '0';
          card.style.right = '0';
          card.style.width = '100%';
          card.style.height = 'calc(100vh - 60px)';
          
          // Position based on relationship to active card
          if (card === activeCard) {
            card.style.zIndex = '1600';
            card.style.transform = 'translateY(0)';
            card.style.opacity = '1';
            card.style.visibility = 'visible';
          } else if (relativePosition === -1) {
            card.style.zIndex = '1500';
            card.style.transform = 'translateY(-98%)';
            card.style.opacity = '0.6';
            card.style.visibility = 'visible';
          } else if (relativePosition === 1) {
            card.style.zIndex = '1500';
            card.style.transform = 'translateY(98%)';
            card.style.opacity = '0.6';
            card.style.visibility = 'visible';
          } else {
            card.style.zIndex = '1400';
            card.style.transform = relativePosition < 0 ? 'translateY(-120%)' : 'translateY(120%)';
            card.style.opacity = '0';
            card.style.visibility = 'hidden';
          }
        });
      }
    };
    
    // Position cards once news is loaded
    if (news.length > 0) {
      setTimeout(positionCards, 100);
    }
  }, [isMobile, news.length, activeIndex]);

  // Ensure isMobile state is consistently applied and updated
  useEffect(() => {
    const handleResize = () => {
      const mobileView = window.innerWidth <= 768;
      setIsMobile(mobileView);
      
      // Force apply correct styles to body for cascade
      if (mobileView) {
        document.body.classList.add('mobile-view');
        document.body.classList.remove('desktop-view');
        
        // Check if we're in landscape mode on mobile
        if (window.matchMedia("(orientation: landscape)").matches) {
          // Show notification or handle landscape mode
        }
      } else {
        document.body.classList.remove('mobile-view');
        document.body.classList.add('desktop-view');
      }
    };
    
    // Handle orientation change
    const handleOrientationChange = () => {
      if (window.innerWidth <= 768) {
        if (window.matchMedia("(orientation: landscape)").matches) {
          // We're in landscape on mobile - show notification
          
          // Optional: vibrate to notify user
          if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(100);
          }
        }
      }
    };
    
    // Initial check
    handleResize();
    
    // Listen for changes
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.body.classList.remove('mobile-view');
      document.body.classList.remove('desktop-view');
    };
  }, []);
  
  // Track scroll position for showing bottom search bar and infinite scrolling
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  useEffect(() => {
    if (!isMobile && containerRef.current) {
      let scrollCount = 0;
      
      const handleScroll = () => {
        // Get current scroll position
        const currentScrollTop = containerRef.current.scrollTop;
        const scrollDirection = currentScrollTop > scrollLeft ? 'down' : 'up';
        
        if (scrollDirection === 'down') {
          scrollCount++;
          
          // Show bottom search after 10 scroll events
          if (scrollCount >= 10 && !showBottomSearch) {
            setShowBottomSearch(true);
          }
          
          // Check if we're near the bottom for infinite scrolling
          const { scrollHeight, scrollTop, clientHeight } = containerRef.current;
          const scrollBottom = scrollHeight - scrollTop - clientHeight;
          
          // If we're within 500px of the bottom, load more (increased threshold for better responsiveness)
          if (scrollBottom < 500 && !isLoadingMore) {
            loadMoreNews();
          }
        }
        
        // Update scrollLeft for next comparison
        setScrollLeft(currentScrollTop);
      };
      
      containerRef.current.addEventListener('scroll', handleScroll);
      
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('scroll', handleScroll);
        }
      };
    }
  }, [isMobile, scrollLeft, showBottomSearch, isLoadingMore]);
  
  // Function to load more news on scroll
  const loadMoreNews = () => {
    setIsLoadingMore(true);
    
    // In a real implementation, we would fetch the next page of news
    setTimeout(() => {
      try {
        // Simply mark as completed without adding mock data
        setIsLoadingMore(false);
        
        // In a production app, we would fetch and add more data here
      } catch (error) {
        debugLog('Error loading more news:', error);
        setIsLoadingMore(false);
      }
    }, 1000);
  };

  const handleCardClick = async (uuid) => {
    // Navigate to the dedicated news detail page with the UUID using React Router
    navigate(`/news/${uuid}`);
  };

  const closeFullScreen = () => {
    setFullScreenNews(null);
  };

  // Mouse events for grid movement on desktop
  const handleMouseDown = (e) => {
    if (isMobile) return;
    setIsDragging(true);
    setStartX(e.pageX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isMobile) return;
    const x = e.pageX;
    const threshold = 50; // Distance needed to trigger navigation
    
    // Detect drag direction and amount
    const distance = x - startX;
    
    // If dragged far enough, navigate
    if (Math.abs(distance) > threshold) {
      if (distance > 0 && activeIndex > 0) {
        // Dragged right, go to previous
        setActiveIndex(activeIndex - 1);
      } else if (distance < 0 && activeIndex < news.length - 1) {
        // Dragged left, go to next
        setActiveIndex(activeIndex + 1);
      }
      
      setIsDragging(false);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // State for quick actions
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [swipingDirection, setSwipingDirection] = useState(null);
  
  // Function to generate haptic feedback if supported
  const triggerHapticFeedback = () => {
    if (window.navigator && window.navigator.vibrate) {
      // Provide subtle vibration for 50ms
      window.navigator.vibrate(50);
    }
  };
  
  // Enhanced touch handling for app-like experience
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchEndY, setTouchEndY] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [isCardContentScrolling, setIsCardContentScrolling] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const cardRefs = useRef([]);
  
  // Scroll to top when active index changes on mobile
  // Use a ref to track the previous active index
  const prevActiveIndexRef = useRef(activeIndex);
  
  // Function to provide haptic feedback on card transition
  const provideHapticFeedback = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };
  
  useEffect(() => {
    if (isMobile) {
      // Find the active card's content area and reset its scroll
      const activeCardContent = document.querySelector('.news-card.active .card-content');
      if (activeCardContent) {
        activeCardContent.scrollTop = 0;
      }
      
      // Apply consistent styles to all cards
      const activeCard = document.querySelector('.news-card.active');
      if (activeCard) {
        // Force the active card to have correct positioning
        activeCard.style.position = 'fixed';
        activeCard.style.top = '60px';
        activeCard.style.left = '0';
        activeCard.style.right = '0';
        activeCard.style.width = '100%';
        activeCard.style.height = 'calc(100vh - 60px)';
        activeCard.style.transform = 'translateY(0)';
        activeCard.style.zIndex = '1600';
        activeCard.style.opacity = '1';
        activeCard.style.visibility = 'visible';
      }
      
      // Special handling for first card
      if (activeIndex === 0) {
        const firstCard = document.querySelector('.news-card:first-child');
        if (firstCard) {
          firstCard.style.position = 'fixed';
          firstCard.style.top = '60px';
          firstCard.style.zIndex = firstCard.classList.contains('active') ? '1600' : '1500';
        }
      }
      
      // Provide haptic feedback when changing cards
      if (prevActiveIndexRef.current !== activeIndex) {
        provideHapticFeedback();
      }
      
      // Update the ref for next render
      prevActiveIndexRef.current = activeIndex;
    }
  }, [activeIndex, isMobile]);
  
  // Simplified and more reliable touch handling - allow swiping across the entire card
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    
    // Store initial touch position
    setTouchStartY(e.touches[0].clientY);
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(false);
    
    // Prevent swiping on interactive elements
    const target = e.target;
    const isInteractive = 
      target.closest('.global-trading-actions') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input');
    
    // Set flag if we're on an interactive element
    setIsCardContentScrolling(isInteractive);
  };

  const handleTouchMove = (e) => {
    if (!isMobile) return;
    
    // Calculate touch movement
    const touchY = e.touches[0].clientY;
    const touchX = e.touches[0].clientX;
    const deltaY = touchY - touchStartY;
    const deltaX = touchX - touchStartX;
    
    // Skip if we're on interactive elements like buttons
    if (isCardContentScrolling) {
      return;
    }
    
    // Get the card content element to check if it's scrolled to top/bottom
    const cardContent = document.querySelector('.news-card.active .card-content');
    const isAtTop = !cardContent || cardContent.scrollTop <= 0;
    const isAtBottom = !cardContent || 
      (cardContent.scrollHeight - cardContent.scrollTop <= cardContent.clientHeight + 5);
    
    // Allow swiping if:
    // 1. Swiping down while at the top of content
    // 2. Swiping up while at the bottom of content
    // 3. Swiping with significant force (large deltaY)
    const canSwipe = 
      (deltaY > 0 && isAtTop) || 
      (deltaY < 0 && isAtBottom) ||
      Math.abs(deltaY) > 40;
    
    // Only handle vertical swipes when allowed
    if (Math.abs(deltaY) > Math.abs(deltaX) && canSwipe) {
      // Try to prevent default scrolling behavior, but handle gracefully if we can't
      // due to passive event listeners in modern browsers
      try {
        e.preventDefault();
      } catch (error) {
        // This is expected in some browsers with passive listeners - continue anyway
      }
      
      // Track swipe state
      if (!isSwiping) {
        setIsSwiping(true);
        
        // When starting a swipe, immediately prep neighboring cards
        if (deltaY > 0 && activeIndex > 0) {
          // Swiping down - show previous card peeking
          const prevCard = document.querySelector(`.news-card:nth-child(${activeIndex})`);
          if (prevCard) {
            prevCard.style.visibility = 'visible';
            prevCard.style.opacity = '0.6';
            prevCard.style.transform = 'translateY(-98%)';
            prevCard.style.transition = 'none'; // No transition during active drag
            prevCard.style.position = 'fixed';
            prevCard.style.top = '60px';
            prevCard.style.left = '0';
            prevCard.style.right = '0';
            prevCard.style.width = '100%';
            prevCard.style.height = 'calc(100vh - 60px)';
          }
        } else if (deltaY < 0 && activeIndex < news.length - 1) {
          // Swiping up - show next card peeking
          const nextCard = document.querySelector(`.news-card:nth-child(${activeIndex + 2})`);
          if (nextCard) {
            nextCard.style.visibility = 'visible';
            nextCard.style.opacity = '0.6';
            nextCard.style.transform = 'translateY(98%)';
            nextCard.style.transition = 'none'; // No transition during active drag
            nextCard.style.position = 'fixed';
            nextCard.style.top = '60px';
            nextCard.style.left = '0';
            nextCard.style.right = '0';
            nextCard.style.width = '100%';
            nextCard.style.height = 'calc(100vh - 60px)';
          }
        }
      }
      
      // Store direction for more accurate swipe detection
      if (Math.abs(deltaY) > 10) {
        setSwipeDirection(deltaY > 0 ? 'down' : 'up');
      }
      
      // Visual feedback - move card with finger
      const activeCard = document.querySelector('.news-card.active');
      if (activeCard) {
        // Apply transform directly to follow finger (with resistance)
        const resistance = 0.3; // Lower = more resistance
        const translateY = deltaY * resistance;
        activeCard.style.transform = `translateY(${translateY}px)`;
        
        // Ensure the card stays fixed
        activeCard.style.position = 'fixed';
        activeCard.style.top = '60px';
        
        // Move the next/prev card along with the swipe for a continuous effect
        if (deltaY > 0 && activeIndex > 0) {
          // Swiping down - animate previous card
          const prevCard = document.querySelector(`.news-card:nth-child(${activeIndex})`);
          if (prevCard) {
            const prevTranslateY = -98 + (deltaY * resistance * 0.5); // Half the movement rate
            prevCard.style.transform = `translateY(${prevTranslateY}%)`;
            prevCard.style.position = 'fixed';
            prevCard.style.top = '60px';
          }
        } else if (deltaY < 0 && activeIndex < news.length - 1) {
          // Swiping up - animate next card
          const nextCard = document.querySelector(`.news-card:nth-child(${activeIndex + 2})`);
          if (nextCard) {
            const nextTranslateY = 98 + (deltaY * resistance * 0.5); // Half the movement rate
            nextCard.style.transform = `translateY(${nextTranslateY}%)`;
            nextCard.style.position = 'fixed';
            nextCard.style.top = '60px';
          }
        }
      }
      
      // Track current position for swipe calculation
      setTouchEndY(touchY);
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    
    // Get the active card and reset its transformation
    const activeCard = document.querySelector('.news-card.active');
    if (activeCard) {
      // Clear inline transforms (will revert to CSS-defined position)
      activeCard.style.transform = '';
    }
    
    // Only process swipe if we were actually swiping
    if (isSwiping) {
      const swipeDistance = touchEndY - touchStartY;
      const minSwipeDistance = 40; // Threshold for activating swipe
      
      // If swipe distance is significant enough, change card
      if (Math.abs(swipeDistance) > minSwipeDistance) {
        // Provide haptic feedback
        provideHapticFeedback();
        
        // Add a class to all cards to ensure transition is applied consistently
        const allCards = document.querySelectorAll('.news-card');
        allCards.forEach(card => {
          card.classList.add('transitioning');
        });
        
        if (swipeDistance > 0 && activeIndex > 0) {
          // Swiped DOWN = go to PREVIOUS card
          setActiveIndex(activeIndex - 1);
        } else if (swipeDistance < 0 && activeIndex < news.length - 1) {
          // Swiped UP = go to NEXT card
          setActiveIndex(activeIndex + 1);
        } else {
          // At edge of cards, cannot navigate further
          // Add a bounce-back animation
          if (activeCard) {
            activeCard.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            activeCard.style.transform = 'translateY(0)';
            activeCard.style.position = 'fixed';
            activeCard.style.top = '60px';
          }
        }
        
        // Remove the transitioning class after animation completes
        setTimeout(() => {
          allCards.forEach(card => {
            card.classList.remove('transitioning');
          });
        }, 400); // Slightly longer than the CSS transition duration
      }
    }
    
    // Reset all touch tracking state
    setIsSwiping(false);
    setIsCardContentScrolling(false);
    setTouchStartY(0);
    setTouchEndY(0);
  };
  
  // Toggle quick actions menu
  const toggleQuickActions = (e) => {
    e.stopPropagation();
    setQuickActionsOpen(!quickActionsOpen);
  };
  
  // Handle quick action selection
  const handleQuickAction = (action, e) => {
    e.stopPropagation();
    
    // Provide haptic feedback
    triggerHapticFeedback();
    
    // Handle different actions
    switch(action) {
      case 'long':
        console.log('Long position selected');
        // Logic for long position
        break;
      case 'short':
        console.log('Short position selected');
        // Logic for short position
        break;
      case 'share':
        console.log('Share selected');
        // Logic for sharing
        break;
      case 'save':
        console.log('Save selected');
        // Logic for saving
        break;
      default:
        break;
    }
    
    // Close the quick actions menu
    setQuickActionsOpen(false);
  };
  
  // Handle global position trading (from the fixed buttons)
  const handleGlobalPosition = (position) => {
    // Get the current active card's news item
    const activeNews = news[activeIndex];
    
    if (!activeNews) return;
    
    // Provide haptic feedback
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    
    console.log(`Global ${position} position on:`, activeNews.title);
    
    // In a real app, this would call an API to place the trade
    // For now, just log it
    alert(`${position.toUpperCase()} position placed on "${activeNews.title}" at $${activeNews.current_value}`);
  };

  // Progress bar calculation
  const progressPercentage = isMobile ? (activeIndex / (news.length - 1)) * 100 : 0;
  
  // Handle search query changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    // In a real implementation, this would trigger search as the user types
  };

  return (
    <>
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <div className="news-colossal-container">
      
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      
      {/* Fixed header for mobile only */}
      {isMobile && (
        <div className="news-header-mobile">
          <div className="logo">
            <img src="/static/logo.svg" alt="Here News" height="30" />
          </div>
          <h1 style={{
            fontSize: '18px', 
            margin: '0 auto',
            fontWeight: 'bold'
          }}>HERE.NEWS</h1>
          <div style={{width: '30px'}}></div>
        </div>
      )}
      
      {/* Desktop search bar */}
      {/* Search moved to header */}
      
      <div 
        ref={containerRef}
        className={`news-carousel ${isMobile ? 'mobile' : 'desktop'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        // Add this attribute to make touch events non-passive
        // This helps with preventDefault() but may affect performance
        style={{'touchAction': 'none', 'paddingTop': isMobile ? '0' : '0'}} 
      >
        {news.map((item, index) => {
          // Set up card style and positioning
          let gridPosition = '';
          let cardStyle = {};
          
          if (isMobile) {
            // MOBILE LAYOUT - FORCE INLINE STYLES TO OVERRIDE CSS
            // Position cards based on their relationship to active card
            const relativePosition = index - activeIndex;
            
            if (relativePosition === 0) {
              // Active card - centered with no top space, fixed position for ALL cards
              cardStyle = {
                transform: 'translateY(0)',
                zIndex: 10,
                opacity: 1,
                visibility: 'visible',
                position: 'fixed', // Use fixed position instead of absolute
                top: '60px', // Position after header
                left: 0,
                right: 0,
                width: '100%',
                height: 'calc(100vh - 60px)', // Full screen minus header
                margin: 0,
                padding: 0,
                borderRadius: 0,
                background: getGenreBackground(item.genre),
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column'
              };
            } else if (relativePosition === -1) {
              // Previous card (above) - position it for swipe down
              cardStyle = {
                transform: 'translateY(-98%)', // Just above the viewport (visible edge)
                zIndex: 8,
                opacity: 0.6,
                visibility: 'visible',
                pointerEvents: 'none',
                position: 'fixed', // Use fixed position to match active card
                top: '60px', // Same positioning as active card
                left: 0,
                right: 0,
                width: '100%',
                height: 'calc(100vh - 60px)',
                margin: 0,
                padding: 0,
                borderRadius: 0,
                background: getGenreBackground(item.genre)
              };
            } else if (relativePosition === 1) {
              // Next card (below) - nearly invisible (just a tiny hint)
              cardStyle = {
                transform: 'translateY(98%)', // Just below the viewport (visible edge)
                zIndex: 8,
                opacity: 0.6,
                visibility: 'visible',
                pointerEvents: 'none',
                position: 'fixed', // Use fixed position to match active card
                top: '60px', // Same positioning as active card
                left: 0,
                right: 0,
                width: '100%',
                height: 'calc(100vh - 60px)',
                margin: 0,
                padding: 0,
                borderRadius: 0,
                background: getGenreBackground(item.genre)
              };
            } else {
              // Other cards - hidden off-screen but maintain position for transitions
              cardStyle = {
                transform: relativePosition < 0 
                  ? 'translateY(-120%)' 
                  : 'translateY(120%)',
                zIndex: relativePosition < 0 ? 7 : 5, // Lower z-index for farther cards
                opacity: 0,
                visibility: 'hidden',
                pointerEvents: 'none',
                position: 'fixed', // Use fixed position to match active card
                top: '60px', // Same positioning as active card
                left: 0,
                right: 0,
                width: '100%',
                margin: 0,
                padding: 0,
                borderRadius: 0,
                background: getGenreBackground(item.genre)
              };
            }
            
            // Function to get background gradient based on genre
            function getGenreBackground(genre) {
              const genreMap = {
                'science': 'linear-gradient(135deg, #4a148c 0%, #7c43bd 100%)',
                'technology': 'linear-gradient(135deg, #4a148c 0%, #7c43bd 100%)',
                'science-technology': 'linear-gradient(135deg, #4a148c 0%, #7c43bd 100%)',
                'environment': 'linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)',
                'economy': 'linear-gradient(135deg, #0d47a1 0%, #2196f3 100%)',
                'finance': 'linear-gradient(135deg, #0d47a1 0%, #2196f3 100%)',
                'health': 'linear-gradient(135deg, #b71c1c 0%, #f44336 100%)',
                'health-technology': 'linear-gradient(135deg, #b71c1c 0%, #f44336 100%)',
                'archaeology': 'linear-gradient(135deg, #795548 0%, #a1887f 100%)',
                'history': 'linear-gradient(135deg, #795548 0%, #a1887f 100%)',
                'politics': 'linear-gradient(135deg, #880e4f 0%, #e91e63 100%)',
                'culture': 'linear-gradient(135deg, #e65100 0%, #ff9800 100%)',
                'sports': 'linear-gradient(135deg, #006064 0%, #00bcd4 100%)',
                'entertainment': 'linear-gradient(135deg, #4a148c 0%, #9c27b0 100%)',
                'news': 'linear-gradient(135deg, #bf360c 0%, #ff5722 100%)'
              };
              
              // Default to news if genre is not found
              const normalizedGenre = (genre || 'news').toLowerCase().replace(/\s+|&/g, '-');
              return genreMap[normalizedGenre] || 'linear-gradient(135deg, #37474f 0%, #78909c 100%)';
            }
            
            // Add transition for smooth movements (but not during active swipe)
            if (isSwiping) {
              // During swipe - no transition for immediate feedback
              cardStyle.transition = 'none';
            } else {
              // After swipe - smooth transition back to position
              cardStyle.transition = 'transform 0.4s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.4s ease';
            }
          } 
          else {
            // Simple grid layout for desktop - no special positioning
            gridPosition = 'grid-item';
            
            // Add extra margin to the last item for better scrolling
            if (index === news.length - 1) {
              cardStyle.marginBottom = '100px';
            }
          }
          
          const isActive = index === activeIndex;
          
          // Add ref to the card for scrolling
          const setCardRef = (el) => {
            cardRefs.current[index] = el;
          };
          
          return (
            <NewsCard 
              key={item.uuid}
              ref={setCardRef}
              news={item}
              isActive={isActive}
              onClick={handleCardClick}
              style={cardStyle}
              isMobile={isMobile}
              gridPosition={gridPosition}
            >
              {isMobile && index === activeIndex && (
                <div className="swipe-indicators">
                  {index > 0 && (
                    <div className="swipe-indicator swipe-up">
                      <span>↑</span>
                    </div>
                  )}
                  {index < news.length - 1 && (
                    <div className="swipe-indicator swipe-down">
                      <span>↓</span>
                    </div>
                  )}
                </div>
              )}
            </NewsCard>
          );
        })}
      </div>
      
      {/* Bottom search bar that appears after scrolling (desktop only) */}
      {!isMobile && (
        <div className={`bottom-search-container ${showBottomSearch ? 'visible' : ''}`}>
          <div className="bottom-search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      )}
      
      {/* Global trading actions - always visible on mobile, more compact design */}
      {isMobile && news.length > 0 && ReactDOM.createPortal(
        <div className="global-trading-actions">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="price-display">
              <span className="price-label">Price</span>
              <span className="price-value">${news[activeIndex]?.current_value || '0.00'}</span>
            </div>
            <MiniPriceChart 
              priceHistory={news[activeIndex]?.price_history} 
              percentChange={news[activeIndex]?.percent_change_24h}
              width={50}
              height={24}
            />
          </div>
          <div className="trading-buttons-container">
            <button className="trading-button long" onClick={() => handleGlobalPosition('long')}>
              LONG
            </button>
            <button className="trading-button short" onClick={() => handleGlobalPosition('short')}>
              SHORT
            </button>
          </div>
        </div>,
        document.body
      )}
      
      {/* Render fullscreen view in a separate container to avoid overlapping */}
      {fullScreenNews && ReactDOM.createPortal(
        <NewsFullScreen news={fullScreenNews} onClose={closeFullScreen} />,
        document.body
      )}
      
      {/* Loading indicator for infinite scroll */}
      {!isMobile && isLoadingMore && (
        <div className="loading-more-indicator">
          <div className="loading-more-spinner"></div>
        </div>
      )}
      
      {/* "Show more" button for desktop view as an alternative to scrolling */}
      {!isMobile && news.length > 0 && !isLoadingMore && (
        <div className="show-more-container">
          <button className="show-more-button" onClick={loadMoreNews}>
            Show More News
          </button>
        </div>
      )}
    </div>
    <Footer isMobile={isMobile} />
    </>
  );
};

export default NewsColossal;