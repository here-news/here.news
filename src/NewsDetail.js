import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import serviceUrl from './config';
import Header from './Header';
import Footer from './Footer';
import getFaviconUrl from "./util";
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
  const [news, setNews] = useState(null);
  const [showIframe, setShowIframe] = useState(false);
  // We no longer need referencedStories state
  const [relatedNews, setRelatedNews] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Trading panel state
  const [newsValue, setNewsValue] = useState(null);
  const [trending, setTrending] = useState('stable');
  const [tradersCount, setTradersCount] = useState(0);
  const [tradeVolume, setTradeVolume] = useState(0);

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
  
  useEffect(() => {
    // Fetch main news data
    fetch(`${serviceUrl}/news/${uuid}`)
      .then(response => response.json())
      .then(data => {
        setNews(data);
        
        // Initialize random trading data
        const initialValue = (Math.random() * 9 + 1).toFixed(2);
        setNewsValue(initialValue);
        
        // Random trend
        const trendOptions = ['up', 'down', 'stable'];
        setTrending(trendOptions[Math.floor(Math.random() * trendOptions.length)]);
        
        // Random traders (50-500)
        setTradersCount(Math.floor(Math.random() * 450) + 50);
        
        // Random volume ($500-$5000)
        setTradeVolume((Math.random() * 4500 + 500).toFixed(2));
        
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

  if (!news) {
    return <div>Loading...</div>;
  }

  const handleUrlClick = (event) => {
    event.preventDefault();
    openInNewTab();
  };

  const closeIframe = () => {
    setShowIframe(false);
  };

  const openInNewTab = () => {
    setShowIframe(false);
    window.open(news.canonical, '_blank');
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
                  <a href={news.canonical} target="_blank" rel="noopener noreferrer" className="read-original-btn">
                    Read Full Article
                  </a>
                </div>
                <div className="news-action-description">
                  <p>Click to read the original article or use the trading panel to buy a share at market price.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4" id="news-sidebar">
            {/* Trading Panel with CSS classes */}
            <div className="trading-panel">
              <h3 className="trading-panel-title">Trading Panel</h3>
              
              <div className={`trading-value ${trending === 'up' ? 'trending-up' : trending === 'down' ? 'trending-down' : 'trending-stable'}`}>
                <span>${newsValue}</span> 
                <span>{trendingArrow}</span>
              </div>
              
              <NewsDetailChart 
                percentChange={trending === 'up' ? '+4.5' : trending === 'down' ? '-2.8' : '0.0'} 
              />
              
              <div className="trading-buttons">
                <button onClick={handleLongPosition} className="trading-button long-button">
                  LONG
                </button>
                <button onClick={handleShortPosition} className="trading-button short-button">
                  SHORT
                </button>
              </div>
              
              <div className="trading-stats">
                <p><strong>Traders:</strong> {tradersCount}</p>
                <p><strong>24h Volume:</strong> ${tradeVolume}</p>
              </div>
            </div>
            
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
      
      {/* Fixed mobile trading panel */}
      {isMobile && (
        <div className="mobile-trading-actions">
          <div className={`mobile-price ${trending === 'up' ? 'trending-up' : trending === 'down' ? 'trending-down' : 'trending-stable'}`}>
            ${newsValue} {trendingArrow}
          </div>
          <div className="mobile-trading-buttons">
            <button onClick={handleLongPosition} className="mobile-trading-button long-button">
              LONG
            </button>
            <button onClick={handleShortPosition} className="mobile-trading-button short-button">
              SHORT
            </button>
          </div>
        </div>
      )}
      
      {showIframe && (
        <div className="iframe-popup">
          <div className="iframe-popup-content">
            <div className="iframe-popup-header">
              <button onClick={closeIframe} className="close-button">✖</button>
              <button onClick={openInNewTab} className="open-button">Open in new tab</button>
            </div>
            <iframe src={news.canonical} title="News Source"></iframe>
          </div>
        </div>
      )}
      
      <Footer isMobile={isMobile} />
    </>
  );
};

export default NewsDetail;