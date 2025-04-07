import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import getFaviconUrl from './util';
import serviceUrl from './config';
import Header from './Header';
import Footer from './Footer';
import './NewsColossal.css';
import { debugLog } from './utils/debugUtils';

// Add fallback for msgpack if needed
let msgpack = null;
try {
  // Use dynamic import instead of CDN
  import('@msgpack/msgpack').then(module => {
    msgpack = module;
    debugLog('MsgPack library loaded successfully');
  }).catch(err => {
    debugLog('MsgPack library failed to load:', err);
  });
} catch (e) {
  debugLog('Error loading msgpack library:', e);
}

// Mini price chart component to show price history
const MiniPriceChart = ({ priceHistory, percentChange, width = 40, height = 20 }) => {
  // Default empty array if no price history provided
  const data = priceHistory || [];
  
  if (!data || data.length === 0) return null;
  
  const minPrice = Math.min(...data);
  const maxPrice = Math.max(...data);
  const range = maxPrice - minPrice;
  const chartColor = parseFloat(percentChange) >= 0 ? '#28a745' : '#dc3545';
  
  const points = data.map((price, index) => {
    const x = (index / (data.length - 1)) * width;
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
  const handleLongPosition = (e) => {
    e.stopPropagation();
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
  };
  
  const handleShortPosition = (e) => {
    e.stopPropagation();
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
  };
  
  const handleCardClick = () => {
    onClick(news.uuid);
  };

  // Value indicator arrow based on trending direction
  const trendingArrow = news.trending === 'up' ? '↑' : news.trending === 'down' ? '↓' : '→';
  const trendingClass = `trending-${news.trending}`;
  
  // Generate CSS genre class
  const getGenreClass = () => {
    let genre = news.genre ? news.genre.toLowerCase().replace(/\s+|&/g, '-') : 'news';
    return `genre-${genre}`;
  };
  
  // Base classes
  let baseClasses = ['news-card'];
  if (isActive) baseClasses.push('active');
  if (!isMobile) {
    if (isActive) baseClasses.push('desktop-active');
    if (gridPosition) baseClasses.push(`position-${gridPosition}`);
  }
  baseClasses.push(getGenreClass());
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
      
      {children}
    </div>
  );
});

const NewsFullScreen = ({ news, onClose }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isMobile] = useState(window.innerWidth <= 768);
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
      {isMobile && (
        <div className="pull-indicator">
          <span className="ticker-refresh">↻ Pull to refresh market data ↻</span>
        </div>
      )}
      
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

// Main component
const NewsColossal = () => {
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
  
  // Network status tracking
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkError, setNetworkError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkError(null);
      if (news.length === 0 && !isLoading) fetchTopNews();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setNetworkError("You're currently offline. Some features may be limited.");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [news.length, isLoading]);

  // Enhanced fetch with better error handling for service worker integration
  const fetchWithFallback = async (url, options = {}, timeout = 10000) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), timeout);
    });
    
    try {
      const response = await Promise.race([
        fetch(url, { 
          ...options,
          // Add cache control headers to help the service worker
          headers: {
            ...options.headers,
            'Cache-Control': 'public, max-age=300', // 5 minute cache
          }
        }),
        timeoutPromise
      ]);
      
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      
      if (msgpack && url.includes('msgpack')) {
        const buffer = await response.arrayBuffer();
        return msgpack.decode(new Uint8Array(buffer));
      }
      
      return await response.json();
    } catch (error) {
      debugLog('Fetch error:', error.message);
      
      // Check cache
      if ('caches' in window) {
        try {
          const cache = await caches.open('news-data');
          const cachedResponse = await cache.match(url);
          if (cachedResponse) {
            debugLog('Using cached data for:', url);
            return await cachedResponse.json();
          }
        } catch (cacheError) {
          debugLog('Cache error:', cacheError);
        }
      }
      
      if (retryCount < maxRetries) throw error;
      
      // Return fallback data
      if (url.includes('/topnews')) {
        return [{
          uuid: 'fallback-1',
          title: 'Unable to load news at this time',
          summary: 'Please check your connection and try again later.',
          source: 'Offline Mode',
          canonical: '#',
          pub_time: new Date().toISOString(),
          preview: '/static/3d.webp',
          author: 'System',
          genre: 'News',
          current_value: '1.00',
          trending: 'stable',
          price_history: [1, 1, 1, 1, 1, 1, 1],
          percent_change_24h: '0.0'
        }];
      }
      
      return { error: 'Failed to fetch data', offline: true };
    }
  };
  
  // Fetch top news
  const fetchTopNews = async () => {
    setIsLoading(true);
    setNetworkError(null);
    
    try {
      const cacheBuster = new Date().getTime();
      const data = await fetchWithFallback(`${serviceUrl}/topnews?range=2h&limit=9&_=${cacheBuster}`);
      
      // Process response data
      let fetchedNews = [];
      
      if (Array.isArray(data)) {
        fetchedNews = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.results)) fetchedNews = data.results;
        else if (Array.isArray(data.data)) fetchedNews = data.data;
        else if (Array.isArray(data.items)) fetchedNews = data.items;
        else if (Array.isArray(data.news)) fetchedNews = data.news;
        else {
          const keys = Object.keys(data).filter(key => key !== 'status' && key !== 'message');
          if (keys.length > 0 && data[keys[0]] && typeof data[keys[0]] === 'object') {
            fetchedNews = Object.values(data);
          } else {
            fetchedNews = [data];
          }
        }
      }
      
      if (!Array.isArray(fetchedNews) || fetchedNews.length === 0) {
        throw new Error('Could not extract news array from API response');
      }
      
      // Add trading data where missing
      fetchedNews = fetchedNews.map(item => {
        if (!item.price_history) {
          const priceHistory = [];
          const trendBias = Math.random() > 0.5 ? 1 : -1;
          const initialPrice = (Math.random() * 3 + 0.5);
          let lastPrice = initialPrice;
          
          for (let i = 0; i < 24; i++) {
            const change = (Math.random() * 0.2 - 0.1) + (trendBias * 0.02);
            lastPrice = Math.max(0.1, lastPrice + change);
            priceHistory.push(lastPrice);
          }
          
          const finalPrice = priceHistory[priceHistory.length - 1];
          const previousPrice = priceHistory[priceHistory.length - 2] || initialPrice;
          const priceDiff = finalPrice - previousPrice;
          const trending = priceDiff > 0.05 ? 'up' : (priceDiff < -0.05 ? 'down' : 'stable');
          const percentChange = ((finalPrice - initialPrice) / initialPrice) * 100;
          
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
      
      // Cache the response
      if ('caches' in window) {
        try {
          const cache = await caches.open('news-data');
          const response = new Response(JSON.stringify(fetchedNews), {
            headers: { 'Content-Type': 'application/json' }
          });
          await cache.put(`${serviceUrl}/topnews?range=2h&limit=9`, response);
        } catch (cacheError) {
          debugLog('Failed to cache news data:', cacheError);
        }
      }
      
      setRetryCount(0);
      setNews(fetchedNews);
    } catch (error) {
      debugLog('Error fetching news:', error);
      
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      if (!navigator.onLine) {
        setNetworkError("You're offline. Please check your connection.");
      } else if (error.message.includes('timed out')) {
        setNetworkError("Request timed out. Server might be busy.");
      } else {
        setNetworkError("Couldn't load news. Please try again later.");
      }
      
      if (newRetryCount < maxRetries) {
        const backoffTime = Math.pow(2, newRetryCount) * 1000;
        setTimeout(() => {
          fetchTopNews();
        }, backoffTime);
      } else {
        loadFromCacheOrFallback();
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load from cache as last resort
  const loadFromCacheOrFallback = async () => {
    if ('caches' in window) {
      try {
        const cache = await caches.open('news-data');
        const cachedResponse = await cache.match(`${serviceUrl}/topnews?range=2h&limit=9`);
        
        if (cachedResponse) {
          const cachedData = await cachedResponse.json();
          setNews(cachedData);
          setNetworkError("Showing previously cached content. Some data may be outdated.");
          return;
        }
      } catch (cacheError) {
        debugLog('Cache error:', cacheError);
      }
    }
    
    // Use minimal fallback data
    setNews([{
      uuid: 'fallback-1',
      title: 'Unable to load news at this time',
      summary: 'Please check your connection and try again later.',
      source: 'Offline Mode',
      canonical: '#',
      pub_time: new Date().toISOString(),
      preview: '/static/3d.webp',
      author: 'System',
      genre: 'News',
      current_value: '1.00',
      trending: 'stable',
      price_history: [1, 1, 1, 1, 1, 1, 1],
      percent_change_24h: '0.0'
    }]);
    setNetworkError("Couldn't load news. Please try again when you're back online.");
  };
  
  // Track if data has been loaded
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Fetch data once on mount
  useEffect(() => {
    if (!hasLoadedData && news.length === 0) {
      fetchTopNews()
        .then(() => setHasLoadedData(true))
        .catch(() => setHasLoadedData(true));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mobile setup effect
  useEffect(() => {
    if (isMobile && containerRef.current) {
      containerRef.current.style.overscrollBehavior = 'none';
      containerRef.current.style.touchAction = 'none';
    }
    
    // Apply card positioning on mobile
    const positionCards = () => {
      if (isMobile && news.length > 0) {
        const allCards = document.querySelectorAll('.news-card');
        allCards.forEach((card, index) => {
          const relativePosition = index - activeIndex;
          card.style.position = 'fixed';
          card.style.top = '60px';
          card.style.left = '0';
          card.style.right = '0';
          card.style.width = '100%';
          card.style.height = 'calc(100vh - 60px)';
          
          if (relativePosition === 0) {
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
    
    if (news.length > 0) {
      setTimeout(positionCards, 100);
    }
  }, [isMobile, news.length, activeIndex]);

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
  
  // Track scroll for infinite loading
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  useEffect(() => {
    if (!isMobile && containerRef.current) {
      let scrollCount = 0;
      
      const handleScroll = () => {
        const currentScrollTop = containerRef.current.scrollTop;
        if (currentScrollTop > scrollLeft) {
          scrollCount++;
          
          if (scrollCount >= 10 && !showBottomSearch) {
            setShowBottomSearch(true);
          }
          
          const { scrollHeight, scrollTop, clientHeight } = containerRef.current;
          if (scrollHeight - scrollTop - clientHeight < 500 && !isLoadingMore) {
            loadMoreNews();
          }
        }
        
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
  
  // Load more news
  const loadMoreNews = () => {
    setIsLoadingMore(true);
    setTimeout(() => setIsLoadingMore(false), 1000);
  };

  // Card navigation
  const handleCardClick = (uuid) => navigate(`/news/${uuid}`);
  const closeFullScreen = () => setFullScreenNews(null);

  // Mouse events for desktop
  const handleMouseDown = (e) => {
    if (!isMobile) {
      setIsDragging(true);
      setStartX(e.pageX);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isMobile) return;
    
    const x = e.pageX;
    const distance = x - startX;
    
    if (Math.abs(distance) > 50) {
      if (distance > 0 && activeIndex > 0) {
        setActiveIndex(activeIndex - 1);
      } else if (distance < 0 && activeIndex < news.length - 1) {
        setActiveIndex(activeIndex + 1);
      }
      setIsDragging(false);
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  
  // Touch handling variables
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchEndY, setTouchEndY] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [isCardContentScrolling, setIsCardContentScrolling] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRefs = useRef([]);
  const prevActiveIndexRef = useRef(activeIndex);
  
  // Provide haptic feedback
  const provideHapticFeedback = () => {
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
  };
  
  // Handle active card changes
  useEffect(() => {
    if (isMobile) {
      const activeCardContent = document.querySelector('.news-card.active .card-content');
      if (activeCardContent) activeCardContent.scrollTop = 0;
      
      const activeCard = document.querySelector('.news-card.active');
      if (activeCard) {
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
      
      if (activeIndex === 0) {
        const firstCard = document.querySelector('.news-card:first-child');
        if (firstCard) {
          firstCard.style.position = 'fixed';
          firstCard.style.top = '60px';
          firstCard.style.zIndex = firstCard.classList.contains('active') ? '1600' : '1500';
        }
      }
      
      if (prevActiveIndexRef.current !== activeIndex) {
        provideHapticFeedback();
      }
      
      prevActiveIndexRef.current = activeIndex;
    }
  }, [activeIndex, isMobile]);
  
  // Touch handling
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    
    setTouchStartY(e.touches[0].clientY);
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(false);
    
    const target = e.target;
    const isInteractive = 
      target.closest('.global-trading-actions') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input');
    
    setIsCardContentScrolling(isInteractive);
  };

  const handleTouchMove = (e) => {
    if (!isMobile) return;
    
    const touchY = e.touches[0].clientY;
    const touchX = e.touches[0].clientX;
    const deltaY = touchY - touchStartY;
    const deltaX = touchX - touchStartX;
    
    if (isCardContentScrolling) return;
    
    const cardContent = document.querySelector('.news-card.active .card-content');
    const isAtTop = !cardContent || cardContent.scrollTop <= 0;
    const isAtBottom = !cardContent || 
      (cardContent.scrollHeight - cardContent.scrollTop <= cardContent.clientHeight + 5);
    
    const canSwipe = 
      (deltaY > 0 && isAtTop) || 
      (deltaY < 0 && isAtBottom) ||
      Math.abs(deltaY) > 40;
    
    if (Math.abs(deltaY) > Math.abs(deltaX) && canSwipe) {
      try { e.preventDefault(); } catch (error) { /* expected with passive listeners */ }
      
      if (!isSwiping) {
        setIsSwiping(true);
        
        if (deltaY > 0 && activeIndex > 0) {
          const prevCard = document.querySelector(`.news-card:nth-child(${activeIndex})`);
          if (prevCard) {
            prevCard.style.visibility = 'visible';
            prevCard.style.opacity = '0.6';
            prevCard.style.transform = 'translateY(-98%)';
            prevCard.style.transition = 'none';
            prevCard.style.position = 'fixed';
            prevCard.style.top = '60px';
            prevCard.style.left = '0';
            prevCard.style.right = '0';
            prevCard.style.width = '100%';
            prevCard.style.height = 'calc(100vh - 60px)';
          }
        } else if (deltaY < 0 && activeIndex < news.length - 1) {
          const nextCard = document.querySelector(`.news-card:nth-child(${activeIndex + 2})`);
          if (nextCard) {
            nextCard.style.visibility = 'visible';
            nextCard.style.opacity = '0.6';
            nextCard.style.transform = 'translateY(98%)';
            nextCard.style.transition = 'none';
            nextCard.style.position = 'fixed';
            nextCard.style.top = '60px';
            nextCard.style.left = '0';
            nextCard.style.right = '0';
            nextCard.style.width = '100%';
            nextCard.style.height = 'calc(100vh - 60px)';
          }
        }
      }
      
      const activeCard = document.querySelector('.news-card.active');
      if (activeCard) {
        const resistance = 0.3;
        const translateY = deltaY * resistance;
        activeCard.style.transform = `translateY(${translateY}px)`;
        activeCard.style.position = 'fixed';
        activeCard.style.top = '60px';
        
        if (deltaY > 0 && activeIndex > 0) {
          const prevCard = document.querySelector(`.news-card:nth-child(${activeIndex})`);
          if (prevCard) {
            const prevTranslateY = -98 + (deltaY * resistance * 0.5);
            prevCard.style.transform = `translateY(${prevTranslateY}%)`;
            prevCard.style.position = 'fixed';
            prevCard.style.top = '60px';
          }
        } else if (deltaY < 0 && activeIndex < news.length - 1) {
          const nextCard = document.querySelector(`.news-card:nth-child(${activeIndex + 2})`);
          if (nextCard) {
            const nextTranslateY = 98 + (deltaY * resistance * 0.5);
            nextCard.style.transform = `translateY(${nextTranslateY}%)`;
            nextCard.style.position = 'fixed';
            nextCard.style.top = '60px';
          }
        }
      }
      
      setTouchEndY(touchY);
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    
    const activeCard = document.querySelector('.news-card.active');
    if (activeCard) activeCard.style.transform = '';
    
    if (isSwiping) {
      const swipeDistance = touchEndY - touchStartY;
      const minSwipeDistance = 40;
      
      if (Math.abs(swipeDistance) > minSwipeDistance) {
        provideHapticFeedback();
        
        const allCards = document.querySelectorAll('.news-card');
        allCards.forEach(card => card.classList.add('transitioning'));
        
        if (swipeDistance > 0 && activeIndex > 0) {
          setActiveIndex(activeIndex - 1);
        } else if (swipeDistance < 0 && activeIndex < news.length - 1) {
          setActiveIndex(activeIndex + 1);
        } else if (activeCard) {
          activeCard.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          activeCard.style.transform = 'translateY(0)';
          activeCard.style.position = 'fixed';
          activeCard.style.top = '60px';
        }
        
        setTimeout(() => {
          allCards.forEach(card => card.classList.remove('transitioning'));
        }, 400);
      }
    }
    
    setIsSwiping(false);
    setIsCardContentScrolling(false);
    setTouchStartY(0);
    setTouchEndY(0);
  };
  
  // Trading position handler
  const handleGlobalPosition = (position) => {
    const activeNews = news[activeIndex];
    if (!activeNews) return;
    
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    alert(`${position.toUpperCase()} position placed on "${activeNews.title}" at $${activeNews.current_value}`);
  };

  // Search query handler
  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  // Genre background helper function for mobile cards
  const getGenreBackground = (genre) => {
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
    
    const normalizedGenre = (genre || 'news').toLowerCase().replace(/\s+|&/g, '-');
    return genreMap[normalizedGenre] || 'linear-gradient(135deg, #37474f 0%, #78909c 100%)';
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
      
      {networkError && (
        <div className="network-error-banner">
          <div className="error-icon">{isOnline ? '⚠️' : '📶'}</div>
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
      
      {isMobile && (
        <div className="news-header-mobile">
          <div className="logo">
            <img src="/static/logo.svg" alt="Here News" height="30" />
          </div>
          <h1 style={{fontSize: '18px', margin: '0 auto', fontWeight: 'bold'}}>
            HERE.NEWS
          </h1>
          <div style={{width: '30px'}}></div>
        </div>
      )}
      
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
        style={{touchAction: 'none', paddingTop: isMobile ? '0' : '0'}} 
      >
        {news.map((item, index) => {
          // Set up card style and positioning
          let gridPosition = '';
          let cardStyle = {};
          
          if (isMobile) {
            const relativePosition = index - activeIndex;
            
            if (relativePosition === 0) {
              cardStyle = {
                transform: 'translateY(0)',
                zIndex: 10,
                opacity: 1,
                visibility: 'visible',
                position: 'fixed',
                top: '60px',
                left: 0,
                right: 0,
                width: '100%',
                height: 'calc(100vh - 60px)',
                margin: 0,
                padding: 0,
                borderRadius: 0,
                background: getGenreBackground(item.genre),
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column'
              };
            } else if (relativePosition === -1) {
              cardStyle = {
                transform: 'translateY(-98%)',
                zIndex: 8,
                opacity: 0.6,
                visibility: 'visible',
                pointerEvents: 'none',
                position: 'fixed',
                top: '60px',
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
              cardStyle = {
                transform: 'translateY(98%)',
                zIndex: 8,
                opacity: 0.6,
                visibility: 'visible',
                pointerEvents: 'none',
                position: 'fixed',
                top: '60px',
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
              cardStyle = {
                transform: relativePosition < 0 ? 'translateY(-120%)' : 'translateY(120%)',
                zIndex: relativePosition < 0 ? 7 : 5,
                opacity: 0,
                visibility: 'hidden',
                pointerEvents: 'none',
                position: 'fixed',
                top: '60px',
                left: 0,
                right: 0,
                width: '100%',
                margin: 0,
                padding: 0,
                borderRadius: 0,
                background: getGenreBackground(item.genre)
              };
            }
            
            cardStyle.transition = isSwiping ? 'none' : 'transform 0.4s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.4s ease';
          } else {
            gridPosition = 'grid-item';
            if (index === news.length - 1) cardStyle.marginBottom = '100px';
          }
          
          const isActive = index === activeIndex;
          const setCardRef = (el) => { cardRefs.current[index] = el; };
          
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
                  {index > 0 && <div className="swipe-indicator swipe-up"><span>↑</span></div>}
                  {index < news.length - 1 && <div className="swipe-indicator swipe-down"><span>↓</span></div>}
                </div>
              )}
            </NewsCard>
          );
        })}
      </div>
      
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
      
      {fullScreenNews && ReactDOM.createPortal(
        <NewsFullScreen news={fullScreenNews} onClose={closeFullScreen} />,
        document.body
      )}
      
      {!isMobile && isLoadingMore && (
        <div className="loading-more-indicator">
          <div className="loading-more-spinner"></div>
        </div>
      )}
      
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