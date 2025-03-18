import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import serviceUrl from './config';
import Header from './Header';
import Footer from './Footer';
import ButtonVote from './ButtonVote';
import RatingBar from './RatingBar';
import getFaviconUrl from "./util";
import './NewsDetail.css';

// Mini price chart component for trading panel
const NewsDetailChart = ({ priceHistory, percentChange, width = 180, height = 80 }) => {
  // Generate random data if none provided
  const data = priceHistory || Array(7).fill(0).map(() => Math.random() * 5 + 1);
  
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
      <svg width={width} height={height} className="mini-chart">
        <polyline
          points={points}
          fill="none"
          stroke={chartColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span className={`percent-change ${parseFloat(percentChange) >= 0 ? 'percent-positive' : 'percent-negative'}`}>
        {parseFloat(percentChange) >= 0 ? '+' : ''}{percentChange || '2.5'}%
      </span>
    </div>
  );
};

const NewsDetail = () => {
  const { uuid } = useParams();
  const [news, setNews] = useState(null);
  const [showIframe, setShowIframe] = useState(false);
  const [referencedStories, setReferencedStories] = useState([]);
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
        
        return data.uuid;
      })
      .then(uuid => {
          fetch(`${serviceUrl}/stories/referencing/${uuid}`)
            .then(response => response.json())
            .then(data => setReferencedStories(data))
            .catch(error => console.error('Error fetching referenced stories:', error));
            return uuid;
      })
      .then(uuid=>{  // fetch related news
        fetch(`${serviceUrl}/relatednews/${uuid}?range=10d`)
          .then(response => response.json())
          .then(data => { setRelatedNews(data) })
          .catch(error => console.error('Error fetching related news:', error));
      }
      )
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
              <div className="news-header">
                <div className="news-source">
                  <img className="news-favicon" src={getFaviconUrl(news.canonical, 24)} alt={news.source} />
                  <a href={`/outlet/${news.source_id}`}><b>{news.source}</b></a>
                  <span className={`genre-badge genre-${news.genre.toLowerCase().replace(/ /g, '-')}`}>
                    {genre_emoji_mapping[news.genre]} {news.genre}
                  </span>
                </div>
                <h1 className="news-title">{news.title}</h1>
                <div className="news-meta">
                  <p>{new Date(news.pub_time).toLocaleDateString()}, by {news.author}</p>
                  <p><a target="_blank" href={news.canonical} onClick={handleUrlClick}>{news.canonical}</a></p>
                </div>
              </div>
              
              <img src={news.preview} className="news-image" onError={(e) => e.target.src = '/static/3d.webp'} alt="News preview" />
              
              <div className="news-summary">
                <p>{news.summary}</p>
              </div>
              
              <div className="news-actions">
                <RatingBar positive={news.positive_ratings} negative={news.negative_ratings} displayNumber={false} target='#comments-list'/>
                <ButtonVote type="up" initialCount={news.positive_ratings} newsId={news.uuid} icon="🡅" />
                <ButtonVote type="down" initialCount={news.negative_ratings} newsId={news.uuid} icon="🡇" />
              </div>
              
              <p className="mt-3"><b>Please read the original article and rate it. </b>(can't read? <span>Ask</span> community.)</p>
              
              <hr className="mt-4 mb-4"/>
              
              <div className="related-news">
                <h3>Related News</h3>
                {relatedNews.length > 0 && (
                  <ul>
                    {relatedNews.map(related => (
                      <li key={related.uuid}>
                        <div className="d-flex align-items-center">
                          <span className="mr-2">{new Date(related.pub_time).toLocaleDateString()}</span>
                          <b className="mr-2">{related.source}</b>
                          <img src={getFaviconUrl(related.canonical, 16)} alt={related.source} />
                        </div>
                        <h4><a href={`/news/${related.uuid}`}>{related.title}</a></h4>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-4" id="news-sidebar">
            {/* Trading Panel with CSS classes */}
            <div className="trading-panel">
              <h3 className="trading-panel-title">Trading Panel</h3>
              
              <div className={`trading-value ${trending === 'up' ? 'trending-up' : trending === 'down' ? 'trending-down' : 'trending-stable'}`}>
                <span>${newsValue}</span> 
                <span style={{ fontSize: '1.2em', marginLeft: '5px' }}>{trendingArrow}</span>
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
            
            {/* Referenced Stories Section */}
            <div className="referenced-stories">
              <h3>Cited by Stories</h3>
              {referencedStories.length > 0 ? (
                <ul>
                  {referencedStories.map(story => (
                    <li key={story.uuid}>
                      <h4><a href={`/story/${story.uuid}`}>{story.title}</a></h4>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No stories referencing this news yet.</p>
              )}
              <div className="mt-3">
                <i>(Coming soon) <br/>Create your own story based on similar news</i>
              </div>
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