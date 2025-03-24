import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import serviceUrl from './config';
import Header from './Header';
import Footer from './Footer';
import getFaviconUrl from "./util";
import TradingPanel from './TradingPanel';
import { useUser } from './UserContext';
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
  const { publicKey, userInfo } = useUser();
  const [news, setNews] = useState(null);
  const [showIframe, setShowIframe] = useState(false);
  // We no longer need referencedStories state
  const [relatedNews, setRelatedNews] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [readingPurchaseStatus, setReadingPurchaseStatus] = useState(null); // 'processing', 'success', 'failed', 'not_needed'
  const [userOwnedShares, setUserOwnedShares] = useState(0);
  const [userHasAccess, setUserHasAccess] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  
  // Trading panel state
  const [newsValue, setNewsValue] = useState(null);
  const [trending, setTrending] = useState('stable');
  const [tradersCount, setTradersCount] = useState(0);
  const [tradeVolume, setTradeVolume] = useState(0);
  const [marketStats, setMarketStats] = useState(null);

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
  
  // Handle trading actions
  const handleLongPosition = (e) => {
    e.preventDefault();
    console.log('Long position on news', uuid);
    // Add haptic feedback for mobile
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    // Mock increase in value
    setNewsValue(prev => (parseFloat(prev) * 1.05).toFixed(2));
    setTrending('up');
    setTradersCount(prev => prev + 1);
    setTradeVolume(prev => prev + parseFloat(newsValue || 0));
  };
  
  const handleShortPosition = (e) => {
    e.preventDefault();
    console.log('Short position on news', uuid);
    // Add haptic feedback for mobile
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    // Mock decrease in value
    setNewsValue(prev => (parseFloat(prev) * 0.95).toFixed(2));
    setTrending('down');
    setTradersCount(prev => prev + 1);
    setTradeVolume(prev => prev + parseFloat(newsValue || 0));
  };
  
  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Check if the user has any shares of this market
  const checkUserShares = async () => {
    if (!publicKey) {
      console.log('⚠️ No public key available, cannot check shares');
      setUserHasAccess(false);
      return 0;
    }

    console.log('⭐ CHECKING USER SHARES for market:', uuid);
    
    try {
      // First try the positions API
      console.log('Fetching positions from API:', `${serviceUrl}/me/positions/${uuid}`);
      const positionsResponse = await fetch(`${serviceUrl}/me/positions/${uuid}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': publicKey
        }
      });
      
      console.log('Positions API response status:', positionsResponse.status);
      
      if (positionsResponse.ok) {
        const positionsData = await positionsResponse.json();
        console.log('⭐ USER POSITIONS for this market:', positionsData);
        
        let longShares = 0;
        
        // Handle both array and object formats
        if (Array.isArray(positionsData)) {
          const longPositions = positionsData.filter(pos => pos.type === 'long');
          longShares = longPositions.reduce((total, pos) => total + (parseInt(pos.shares) || 0), 0);
        } else if (typeof positionsData === 'object') {
          longShares = parseInt(positionsData.long_shares) || 0;
        }
        
        console.log(`Setting user owned shares to ${longShares} from API positions data`);
        
        // Always use the exact API value for shares - source of truth
        setUserOwnedShares(longShares);
        setUserHasAccess(longShares > 0);
        return longShares;
      } else {
        // Try fetching user data and checking token balances
        console.log('Positions API failed, trying to get user data instead');
        const userResponse = await fetch(`${serviceUrl}/me`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Public-Key': publicKey
          }
        });
        
        console.log('User API response status:', userResponse.status);
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('⭐ USER DATA from API:', userData);
          
          let shares = 0;
          
          // Check token balances to see if user owns any shares
          if (userData.token_balances) {
            if (typeof userData.token_balances === 'object' && !Array.isArray(userData.token_balances)) {
              shares = parseInt(userData.token_balances[uuid]) || 0;
            } else if (Array.isArray(userData.token_balances)) {
              const matchingToken = userData.token_balances.find(token => 
                token.news_id === uuid || token.market_id === uuid || token.id === uuid);
                
              if (matchingToken) {
                shares = parseInt(matchingToken.balance) || 
                         parseInt(matchingToken.amount) || 
                         parseInt(matchingToken.shares) || 0;
              }
            }
          }
          
          console.log(`Setting user owned shares to ${shares} from token balances`);
          
          // Always use the exact API value for shares - source of truth
          setUserOwnedShares(shares);
          setUserHasAccess(shares > 0);
          return shares;
        } else {
          console.log('User API failed with status:', userResponse.status);
        }
      }
    } catch (error) {
      console.error('⚠️ Error checking user shares:', error);
    }
    
    // Default case: no shares found or error occurred
    console.log('No shares found or error occurred, setting shares to 0');
    setUserOwnedShares(0);
    setUserHasAccess(false);
    return 0;
  };
  
  // Function to fetch current market price data
  const fetchMarketData = async () => {
    try {
      const response = await fetch(`${serviceUrl}/market/${uuid}/stats`);
      
      if (response.ok) {
        const marketData = await response.json();
        console.log('Fetched market data:', marketData);
        
        // Update market stats with real data
        setMarketStats(marketData);
        
        // Set trend based on actual market data
        if (marketData.percent_change) {
          if (parseFloat(marketData.percent_change) > 0) {
            setTrending('up');
          } else if (parseFloat(marketData.percent_change) < 0) {
            setTrending('down');
          } else {
            setTrending('stable');
          }
        }
        
        // Set other values from real market data if available
        if (marketData.volume) setTradeVolume(marketData.volume);
        if (marketData.user_count) setTradersCount(marketData.user_count);
        if (marketData.current_price) setNewsValue(marketData.current_price);
        
        return marketData;
      } else {
        console.error('Failed to fetch market data:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
      return null;
    }
  };

  useEffect(() => {
    // Fetch main news data
    fetch(`${serviceUrl}/news/${uuid}`)
      .then(response => response.json())
      .then(data => {
        setNews(data);
        
        // Fetch real market data instead of using random values
        fetchMarketData().catch(error => {
          console.error('Error in fetchMarketData:', error);
          
          // Fallback to random data if we can't get real market data
          const initialValue = (Math.random() * 9 + 1).toFixed(2);
          setNewsValue(initialValue);
          
          const trendOptions = ['up', 'down', 'stable'];
          setTrending(trendOptions[Math.floor(Math.random() * trendOptions.length)]);
          
          setTradersCount(Math.floor(Math.random() * 450) + 50);
          setTradeVolume((Math.random() * 4500 + 500).toFixed(2));
        });
        
        // Fetch related news using the new endpoint
        fetch(`${serviceUrl}/news/${uuid}/related`)
          .then(response => {
            console.log('Related news response status:', response.status);
            return response.json();
          })
          .then(data => { 
            console.log('Related news data from new endpoint:', data);
            // Check if data is directly an array or if it's an object with an array property
            if (Array.isArray(data)) {
              setRelatedNews(data);
            } else if (data && typeof data === 'object') {
              // Check for common properties that might contain the array
              const possibleArrayProps = ['data', 'results', 'items', 'news', 'relatedNews'];
              for (const prop of possibleArrayProps) {
                if (Array.isArray(data[prop])) {
                  console.log(`Found related news in "${prop}" property`);
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
  
  // Check if user has shares whenever relevant state changes
  useEffect(() => {
    if (publicKey && news) {
      console.log('Checking user shares due to state change');
      // This will update userOwnedShares with the actual value from the server
      checkUserShares();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, news, uuid, showIframe, lastRefreshTime]);
  

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
  
  // Periodically check for updated share counts
  useEffect(() => {
    // Only run if the user is logged in
    if (!publicKey) return;
    
    // Set up a periodic check for share updates
    const shareUpdateInterval = setInterval(() => {
      if (publicKey && news) {
        // Quietly check for updated shares
        checkUserShares();
      }
    }, 10000); // Check every 10 seconds
    
    // Clean up on unmount
    return () => {
      clearInterval(shareUpdateInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, news, uuid]);

  if (!news) {
    return <div>Loading...</div>;
  }
  
  // Buy one share to get access to the full article - uses the exact same process as buying from trading panel
  const buyAccessShare = async () => {
    if (!publicKey) {
      alert('Please log in to read the full article');
      return;
    }
    
    setReadingPurchaseStatus('processing');
    
    try {
      // Get current price from market stats
      const currentPrice = marketStats?.current_price || 0.02; // Default to 2 cents if no price available
      
      // Use the same order payload format as the trading panel
      const orderPayload = {
        type: 'MARKET', 
        side: 'buy',
        quantity: 1, // Just one share for access
        price: currentPrice,
        news_id: uuid,
        position_effect: 'open'
      };
      
      // Use the same endpoint as the trading panel
      const endpoint = `${serviceUrl}/market/${uuid}/orders`;
      
      console.log('Processing payment for article access:', orderPayload);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': publicKey
        },
        body: JSON.stringify(orderPayload)
      });
      
      console.log('Trade response status:', response.status);
      
      // Parse the response
      let responseData;
      try {
        const responseText = await response.text();
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing response:', e);
        responseData = { success: false, message: 'Could not parse response' };
      }
      
      console.log('Trade response:', responseData);
      
      if (response.ok && responseData.success) {
        // Success! Immediately show success
        setReadingPurchaseStatus('success');
        setUserOwnedShares(prev => prev + 1);
        setUserHasAccess(true);
        
        // Since the share purchase was successful, immediately show the article
        // just like the "buy long" button in trading panel
        showArticle();
        
        // Also update position data in the background
        checkUserShares();
      } else {
        // Handle error
        let errorMessage;
        if (responseData && responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData && responseData.detail) {
          // Handle array of validation errors (common API format)
          if (Array.isArray(responseData.detail)) {
            const errors = responseData.detail.map(err => {
              if (err.msg) return err.msg;
              return JSON.stringify(err);
            });
            errorMessage = errors.join(', ');
          } else {
            errorMessage = typeof responseData.detail === 'object'
              ? JSON.stringify(responseData.detail)
              : responseData.detail;
          }
        } else {
          errorMessage = `Payment failed: ${response.status} ${response.statusText}`;
        }
        
        setReadingPurchaseStatus('failed');
        console.error('Payment failed:', errorMessage);
        
        // Show specific error messages based on the error type
        if (errorMessage.includes('balance') || errorMessage.includes('fund')) {
          alert('Insufficient funds to purchase access. Please add funds to your account.');
        } else if (response.status === 401 || response.status === 403) {
          alert('Authentication required. Please log in to purchase access.');
        } else {
          alert(`Failed to process payment: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      setReadingPurchaseStatus('failed');
      alert('Network error occurred while processing payment. Please try again later.');
    }
  };

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
        buyAccessShare();
      }
    }
  };

  const closeIframe = async () => {
    setShowIframe(false);
    
    // Force refresh of all data when iframe is closed
    try {
      // Fetch latest share count from server
      const currentShares = await checkUserShares();
      console.log('Updated shares after closing iframe:', currentShares);
      
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
                console.log('Trade completed in trading panel:', { actionType, shares, price });
                // Wait for API to reflect the changes
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Force a thorough refresh of all data
                const updatedShares = await checkUserShares();
                console.log('Updated shares after trade completed:', updatedShares);
                
                // Fetch updated market data
                await fetchMarketData();
                
                // Force component refresh
                setLastRefreshTime(Date.now());
              }} 
            />
            
            {/* Related News Section */}
            <div className="related-news-sidebar">
              <h3>Similar News</h3>
              {console.log('Current relatedNews state:', relatedNews)}
              {relatedNews && relatedNews.length > 0 ? (
                <ul className="related-news-list">
                  {relatedNews.map(related => {
                    console.log('Rendering related news item:', related);
                    return (
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
                    );
                  })}
                </ul>
              ) : (
                <p>No similar news available. {JSON.stringify(relatedNews)}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Our TradingPanel is already responsive, so we don't need a separate mobile version */}
      
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