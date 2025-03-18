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
    <div style={{ 
      width: '100%',
      margin: '15px 0',
      position: 'relative' 
    }}>
      <svg width={width} height={height} style={{
        width: '100%',
        height: '80px',
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: '4px',
        padding: '5px'
      }}>
        <polyline
          points={points}
          fill="none"
          stroke={chartColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span style={{
        position: 'absolute',
        right: '10px',
        top: '5px',
        fontSize: '14px',
        fontWeight: 'bold',
        color: parseFloat(percentChange) >= 0 ? '#28a745' : '#dc3545'
      }}>
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
              <p><img src={getFaviconUrl(news.canonical, 32)} /> <b><a href={`/outlet/${news.source_id}`}>{news.source}</a></b> / <b> {genre_emoji_mapping[news.genre] + ' ' + news.genre}</b></p>
              <h3>{news.title}</h3>
              <p>🔗 <u><a target="_blank" href={news.canonical} onClick={handleUrlClick}>{news.canonical}</a></u></p>
              <p>{new Date(news.pub_time).toLocaleDateString()}, by {news.author}</p>
              <img src={news.preview} className="news-image" onError={(e) => e.target.src = '/static/3d.webp'} alt="News preview" />
              <p><b><u>Summary</u>:</b> {news.summary} </p>
              <RatingBar positive={news.positive_ratings} negative={news.negative_ratings} displayNumber={false} target='#comments-list'/>
              <ButtonVote type="up" initialCount={news.positive_ratings} newsId={news.uuid} icon="🡅" />
              <ButtonVote type="down" initialCount={news.negative_ratings} newsId={news.uuid} icon="🡇" />
              <p><b>Please read the original article and rate it. </b>(can't read? <span>Ask</span> community.)</p>
              <hr/>
              <div className="related-news">
                <h3>Related News</h3>
                {relatedNews.length > 0 && (
                  <ul>
                    {relatedNews.map(related => (
                      <li key={related.uuid}>
                        {new Date(related.pub_time).toLocaleDateString()}, <b>{related.source}</b> <img src={getFaviconUrl(related.canonical, 20)} />
                        <h4><a href={`/news/${related.uuid}`}>{related.title}</a></h4>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-4" id="news-sidebar">
            {/* Trading Panel with direct inline styling */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '10px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              marginBottom: '20px',
              border: '2px solid #007bff',
              backgroundImage: 'linear-gradient(to bottom, #f8f9fa, #e9ecef)',
              position: 'sticky',
              top: '20px'
            }}>
              <h3 style={{
                fontSize: '20px',
                marginTop: '0',
                color: '#007bff',
                borderBottom: '2px solid #007bff',
                paddingBottom: '10px',
                marginBottom: '15px',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>Trading Panel</h3>
              
              <div style={{
                fontSize: '32px',
                fontWeight: 'bold',
                textAlign: 'center',
                margin: '15px 0',
                padding: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '5px',
                color: trending === 'up' ? '#28a745' : trending === 'down' ? '#dc3545' : '#6c757d'
              }}>
                <span style={{ letterSpacing: '0.5px' }}>${newsValue}</span> 
                <span style={{ fontSize: '1.2em', marginLeft: '5px' }}>{trendingArrow}</span>
              </div>
              
              <NewsDetailChart 
                percentChange={trending === 'up' ? '+4.5' : trending === 'down' ? '-2.8' : '0.0'} 
              />
              
              <div style={{ display: 'flex', gap: '10px', margin: '15px 0' }}>
                <button onClick={handleLongPosition} style={{
                  flex: '1',
                  padding: '10px',
                  border: 'none',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  backgroundColor: '#28a745',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  LONG
                </button>
                <button onClick={handleShortPosition} style={{
                  flex: '1',
                  padding: '10px',
                  border: 'none',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  SHORT
                </button>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                color: '#666',
                marginTop: '15px',
                borderTop: '1px solid #eee',
                paddingTop: '15px'
              }}>
                <p><strong>Traders:</strong> {tradersCount}</p>
                <p><strong>24h Volume:</strong> ${tradeVolume}</p>
              </div>
            </div>
            
            {/* Referenced Stories Section */}
            <div className="referenced-stories mt-4">
              <h3>Cited by Stories</h3>
              {referencedStories.length > 0 && (
                <ul>
                  {referencedStories.map(story => (
                    <li key={story.uuid}>
                      <h4><a href={`/story/${story.uuid}`}>{story.title}</a></h4>
                    </li>
                  ))}
                </ul>
              )}
              <tagline>(Coming soon) <br/>Create your own story based on similar news</tagline>
            </div>
          </div>
        </div>
      </div>
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