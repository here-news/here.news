import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import serviceUrl from './config';
import Header from './Header';
import Footer from './Footer';
import getFaviconUrl from "./util";
import TradingPanel from './TradingPanel';
import { useUser } from './UserContext';
import { useMarketData, useUserPositions, useWebSocketConnection } from './hooks';
import './NewsDetail.css';

// Mini price chart component to match the NewsColossal implementation
const NewsDetailChart = ({ percentChange, width = 100, height = 40 }) => {
  // Generate sample data points based on trend - 10 points of predictable data
  const generateSampleData = () => {
    const parsedChange = parseFloat(percentChange || 0);
    const baseValue = 10; // Arbitrary base value
    const points = [];
    
    if (parsedChange > 0) {
      // Upward trend
      for (let i = 0; i < 10; i++) {
        points.push(baseValue * (0.85 + (i / 10) * 0.3));
      }
    } else if (parsedChange < 0) {
      // Downward trend
      for (let i = 0; i < 10; i++) {
        points.push(baseValue * (1.15 - (i / 10) * 0.3));
      }
    } else {
      // Stable trend with slight variations
      for (let i = 0; i < 10; i++) {
        points.push(baseValue * (0.95 + (i % 2) * 0.1));
      }
    }
    
    return points;
  };
  
  // Generate sample data
  const data = generateSampleData();
  
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
    <div className="nd-chart-container">
      <svg width={width} height={height} className="nd-price-chart">
        <polyline
          points={points}
          fill="none"
          stroke={chartColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span className={`nd-percent-change ${parseFloat(percentChange) >= 0 ? 'nd-positive' : 'nd-negative'}`}>
        {parseFloat(percentChange) >= 0 ? '+' : ''}{percentChange || '0.0'}%
      </span>
    </div>
  );
};

const NewsDetail = () => {
  const { uuid } = useParams();
  const { publicKey } = useUser();
  const [news, setNews] = useState(null);
  const [showIframe, setShowIframe] = useState(false);
  const [relatedNews, setRelatedNews] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  // Use custom hooks for data fetching and state management
  const { 
    marketStats, 
    trending, 
    newsValue, 
    tradersCount, 
    tradeVolume, 
    fetchMarketData
  } = useMarketData(uuid);
  
  const {
    userOwnedShares,
    userHasAccess,
    readingPurchaseStatus,
    checkUserShares,
    buyAccessShare,
    setReadingPurchaseStatus
  } = useUserPositions(uuid);
  
  // Initialize WebSocket connection using the shared WebSocketManager
  const websocket = useWebSocketConnection({
    endpoint: '/ws/user',
    newsId: uuid,
    publicKey
  });

  // Register for specific message types
  useEffect(() => {
    if (!websocket.isConnected) return;
    
    // Register for positions updates - handle both legacy and belief market formats
    const unregisterPositionUpdates = websocket.registerForMessageType('positions_update', (data) => {
      if (data && data.news_id === uuid) {
        // Just call checkUserShares to update UI - no need to manually calculate shares
        checkUserShares();
      }
    });
    
    // Register for belief market position updates
    const unregisterPositionMessages = websocket.registerForMessageType('position', (data) => {
      if (data && data.news_id === uuid) {
        checkUserShares();
      }
    });
    
    // Register for batched messages
    const unregisterBatchMessages = websocket.registerForMessageType('batch', (data) => {
      if (Array.isArray(data)) {
        data.forEach(message => {
          if ((message.type === 'position' || message.type === 'positions_update') && 
              message.news_id === uuid) {
            checkUserShares();
          }
        });
      }
    });
    
    // Cleanup on unmount or reconnect
    return () => {
      unregisterPositionUpdates();
      unregisterPositionMessages();
      unregisterBatchMessages();
    };
  }, [websocket.isConnected, websocket.registerForMessageType, uuid, checkUserShares]);

  let genre_emoji_mapping = { 
    "News": "📰", 
    "Analysis": "📊", 
    "Interview": "🗣️", 
    "Editorial": "✍️", 
    "Opinion": "💬", 
    "Feature": "📚", 
    "Investigative": "🔍", 
    "Entertainment & Lifestyle": "🎥", 
    "Sports": "🏅", 
    "Science & Education": "🧪", 
    "Miscellaneous": "🪁" 
  };
  
  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Add a class to body when on mobile to enable fixed trading panel
  useEffect(() => {
    if (isMobile) {
      document.body.classList.add('has-fixed-trading');
    } else {
      document.body.classList.remove('has-fixed-trading');
    }
    
    return () => {
      document.body.classList.remove('has-fixed-trading');
    };
  }, [isMobile]);

  // Fetch main news data and related news
  useEffect(() => {
    // Fetch main news data
    fetch(`${serviceUrl}/news/${uuid}`)
      .then(response => response.json())
      .then(data => {
        setNews(data);
        
        // Fetch related news using the new endpoint
        fetch(`${serviceUrl}/news/${uuid}/related`)
          .then(response => {
            return response.json();
          })
          .then(data => { 
            // Check if data is directly an array or if it's an object with an array property
            if (Array.isArray(data)) {
              setRelatedNews(data);
            } else if (data && typeof data === 'object') {
              // Check for common properties that might contain the array
              const possibleArrayProps = ['data', 'results', 'items', 'news', 'relatedNews'];
              for (const prop of possibleArrayProps) {
                if (Array.isArray(data[prop])) {
                  setRelatedNews(data[prop]);
                  return;
                }
              }
              
              // If we couldn't find an array in the expected properties, log it and use whatever we got
              console.log('Could not find array property in data, using as-is');
              setRelatedNews(data);
            } else {
              console.log('Unexpected data format for related news:', typeof data);
              setRelatedNews([]);
            }
          })
          .catch(error => {
            console.error('Error fetching related news:', error);
            // Fallback to old endpoint if new one fails
            console.log('Falling back to old endpoint for related news');
            fetch(`${serviceUrl}/relatednews/${uuid}?range=10d`)
              .then(response => response.json())
              .then(data => { 
                console.log('Related news data from fallback endpoint:', data);
                // Same logic as above for handling the data format
                if (Array.isArray(data)) {
                  setRelatedNews(data);
                } else if (data && typeof data === 'object') {
                  const possibleArrayProps = ['data', 'results', 'items', 'news', 'relatedNews'];
                  for (const prop of possibleArrayProps) {
                    if (Array.isArray(data[prop])) {
                      console.log(`Found related news in "${prop}" property from fallback`);
                      setRelatedNews(data[prop]);
                      return;
                    }
                  }
                  console.log('Could not find array property in fallback data, using as-is');
                  setRelatedNews(data);
                } else {
                  console.log('Unexpected data format for related news from fallback:', typeof data);
                  setRelatedNews([]);
                }
              })
              .catch(fallbackError => console.error('Error with fallback related news fetch:', fallbackError));
          });
      })
      .catch(error => console.error('Error fetching news:', error));
  }, [uuid]);
  
  // Check user shares when necessary state changes
  useEffect(() => {
    if (publicKey && news) {
      console.log('Checking user shares due to state change');
      checkUserShares();
    }
  }, [publicKey, news, uuid, showIframe, lastRefreshTime, checkUserShares]);

  if (!news) {
    return <div>Loading...</div>;
  }

  const handleUrlClick = async (event) => {
    if (event) event.preventDefault();
    
    // Check if we're already processing a payment
    if (readingPurchaseStatus === 'processing') {
      return; // Do nothing if already processing
    }
    
    // Check if user has access based on shares owned
    if (userHasAccess || userOwnedShares > 0) {
      // User already has access, show the article
      showArticle();
    } else {
      // User doesn't have access, do a final check with the API
      const currentShares = await checkUserShares();
      
      if (currentShares > 0) {
        // User has shares according to API, show the article
        showArticle();
      } else {
        // User definitely doesn't have access, initiate purchase
        const currentPrice = marketStats?.current_price || 0.02;
        const result = await buyAccessShare(currentPrice);
        
        if (result.success) {
          // Since the share purchase was successful, immediately show the article
          showArticle();
        } else {
          // Show specific error messages based on the error type
          if (result.message.includes('balance') || result.message.includes('fund')) {
            alert('Insufficient funds to purchase access. Please add funds to your account.');
          } else if (result.message.includes('401') || result.message.includes('403')) {
            alert('Authentication required. Please log in to purchase access.');
          } else {
            alert(`Failed to process payment: ${result.message}`);
          }
        }
      }
    }
  };

  const closeIframe = async () => {
    setShowIframe(false);
    
    // Force refresh of all data when iframe is closed
    try {
      // Fetch latest share count from server
      await checkUserShares();
      
      // Fetch latest market data
      await fetchMarketData();
      
      // Force component refresh
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error('Error refreshing data after closing iframe:', error);
    }
  };

  const openInNewTab = () => {
    setShowIframe(false);
    window.open(news.canonical, '_blank');
  };
  
  const showArticle = () => {
    // Generate a "ticket" parameter to include with the URL
    const timestamp = Date.now();
    const ticket = `ticket=${btoa(`${uuid}_${publicKey || 'guest'}_${timestamp}`)}`;
    
    // Show iframe with the article
    setShowIframe(true);
  };

  // Value trend indicator
  const trendingArrow = trending === 'up' 
    ? '↑' 
    : trending === 'down' 
      ? '↓' 
      : '→';
  
  return (
    <>
      <Header />
      <div className="container mt-3 news-detail-page">
        <div className="row">
          <div className="col-md-8">
            <div className="refcard">
              {/* Hero section with improved layout for title and image */}
              <div className="news-hero">
                <div className="news-source-container">
                  <div className="news-source">
                    <img className="news-favicon" src={getFaviconUrl(news.canonical, 24)} alt={news.source} />
                    <a href={`/outlet/${news.source_id}`} className="news-source-name">{news.source}</a>
                    <span className={`genre-badge genre-${news.genre.toLowerCase().replace(/ /g, '-')}`}>
                      {genre_emoji_mapping[news.genre]} {news.genre}
                    </span>
                  </div>
                  <div className="news-publish-info">
                    <span className="news-date">{new Date(news.pub_time).toLocaleDateString()}</span>
                    {news.author && <span className="news-author">by {news.author}</span>}
                  </div>
                </div>
                
                <h1 className="news-title">{news.title}</h1>
                
                <div className="news-image-container">
                  <img src={news.preview} className="news-image" onError={(e) => e.target.src = '/static/3d.webp'} alt={news.title} />
                  <a href={news.canonical} className="news-source-link" onClick={handleUrlClick}>
                    Source: {new URL(news.canonical).hostname.replace('www.', '')}
                  </a>
                </div>
              </div>
              
              <div className="news-summary">
                <p>{news.summary}</p>
              </div>
              
              <div className="news-actions-container">
                <div className="news-read-original">
                  <button 
                    onClick={handleUrlClick} 
                    className={`read-original-btn ${readingPurchaseStatus === 'processing' ? 'processing' : ''}`}
                  >
                    {userHasAccess || userOwnedShares > 0
                      ? `Read Full Article (You own ${userOwnedShares} share${userOwnedShares !== 1 ? 's' : ''})`
                      : readingPurchaseStatus === 'processing' 
                        ? 'Processing Payment...' 
                        : readingPurchaseStatus === 'failed' 
                          ? 'Payment Failed - Try Again' 
                          : `Buy 1 Share (${(marketStats?.current_price ? (marketStats.current_price * 100).toFixed(1) : "2.0")}¢) to Read Article`}
                  </button>
                </div>
                <div className="news-action-description">
                  <p>
                    {userHasAccess || userOwnedShares > 0
                      ? 'Click to read the full article in our secure viewer.'
                      : readingPurchaseStatus === 'failed' 
                        ? 'There was an error processing your payment. Please try again or buy shares through the trading panel.' 
                        : 'Purchase one share to access the full article. You can also use the trading panel to buy more shares.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4" id="news-sidebar">
            {/* Modern Trading Panel Component with onTradeComplete callback */}
            <TradingPanel 
              newsId={uuid} 
              onTradeComplete={async (actionType, shares, price) => {
                // For buy and sell operations, immediately update the UI to match the TradingPanel state
                if (actionType === 'buy') {
                  // Just force a refresh of positions data to ensure consistency
                  await checkUserShares();
                } else if (actionType === 'sell') {
                  // Just force a refresh of positions data to ensure consistency
                  await checkUserShares();
                }
                
                // Fetch updated market data
                await fetchMarketData();
                
                // Force component refresh
                setLastRefreshTime(Date.now());
              }} 
            />
            
            {/* Related News Section */}
            <div className="related-news-sidebar">
              <h3>Similar News</h3>
              {relatedNews && relatedNews.length > 0 ? (
                <ul className="related-news-list">
                  {relatedNews.map(related => (
                    <li key={related.uuid} className="related-news-item">
                      <div className="related-news-source">
                        <img src={getFaviconUrl(related.canonical || "#", 16)} alt={related.source} className="related-news-favicon" />
                        <span className="related-news-source-name">{related.source}</span>
                        <span className="related-news-date">{new Date(related.pub_time).toLocaleDateString()}</span>
                      </div>
                      <a href={`/news/${related.uuid}`} className="related-news-title">
                        {related.title}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No similar news available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {showIframe && (
        <div className="iframe-popup">
          <div className="iframe-popup-content">
            <div className="iframe-popup-header">
              <div className="iframe-title">
                <img className="news-favicon" src={getFaviconUrl(news.canonical, 20)} alt={news.source} />
                <span>{news.source}</span>
              </div>
              <div className="iframe-share-info">
                <span>You own {userOwnedShares} share{userOwnedShares !== 1 ? 's' : ''}</span>
              </div>
              <div className="iframe-controls">
                <button onClick={openInNewTab} className="iframe-open-button">Open in new tab</button>
                <button onClick={closeIframe} className="iframe-close-button">✖ Close</button>
              </div>
            </div>
            <iframe 
              src={`${news.canonical}${news.canonical.includes('?') ? '&' : '?'}ticket=${btoa(`${uuid}_${publicKey || 'guest'}_${Date.now()}`)}`} 
              title="News Source"
            ></iframe>
          </div>
        </div>
      )}
      
      <Footer isMobile={isMobile} />
    </>
  );
};

export default NewsDetail;