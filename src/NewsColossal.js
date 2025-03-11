import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import getFaviconUrl from './util';
import serviceUrl from './config';
import './NewsColossal.css';

// Example news entry - will be replaced by API data
// Fallback mock data in case API fails
const realNews = [
  {
    uuid: "mockid1",
    title: "U.S. to be ready for war on China by 2027: Navy Chief",
    summary: "Adm. Lisa Franchetti, Chief of Naval Operations, announced on Sept. 18, 2024, that the U.S. aims to be prepared for potential conflict with China by 2027; a large-scale military exercise named Kamandang began on Oct. 15, 2024, in the Philippines, involving over 2,300 personnel from the U.S., Philippines, Japan, South Korea, Australia, and Britain, scheduled to conclude on Oct. 25, 2024; the exercise includes live fire drills and training for chemical and biological warfare; U.S. military operations in the Asia-Pacific are increasing, with more aircraft carriers and submarines deployed, and military bases in the Philippines expanding from five to nine; the trilateral military alliance AUKUS is increasing NATO's involvement in regional strategies; North Korea and China have criticized these developments as an attempt to create an Asian version of NATO; newly elected Japanese Prime Minister Shigeru Ishiba supports a collective self-defense system akin to NATO.",
    canonical: "https://mronline.org/2024/10/21/u-s-to-be-ready-for-war-on-china-by-2027-navy-chief/",
    preview: "https://www.economist.com/cdn-cgi/image/width=960,quality=80,format=auto/content-assets/images/20250104_IRD001.jpg",
    pub_time: "2024-10-22T00:12:11",
    author: "Gary Wilson",
    source: "MR Online",
    genre: "News",
    aboutness: "U.S. military readiness for conflict with China",
    positive_ratings: 778,
    negative_ratings: 124,
    shares: 356,
    tips: 95,
    adoption_count: 214,
    traders: 66,
    current_value: 2.14,
    trending: 'up'
  },
  {
    uuid: "mockid2",
    title: "Inflation in Argentina expected to exceed 300% in 2023",
    summary: "According to the International Monetary Fund, inflation in Argentina is projected to reach over 300% by the end of 2023. The country is facing a severe economic crisis with rising prices, currency devaluation, and growing poverty. The newly elected president, Javier Milei, has promised radical economic reforms including dollarization and significant cuts to public spending to address the inflation crisis.",
    canonical: "https://www.infobae.com/economia/2023/12/05/el-fmi-empeoro-su-proyeccion-de-inflacion-para-la-argentina/",
    preview: "https://greaterkashmir.imagibyte.sortdcdn.net/wp-content/uploads/2025/01/Screenshot-635.png?type=webp&quality=80&size=800",
    pub_time: "2023-12-05T14:30:00",
    author: "Economics Staff",
    source: "Infobae",
    genre: "Economy",
    aboutness: "Argentina's economic crisis and inflation",
    positive_ratings: 412,
    negative_ratings: 89,
    shares: 256,
    tips: 45,
    adoption_count: 98,
    traders: 122,
    current_value: 0.87,
    trending: 'down'
  },
  {
    uuid: "mockid3",
    title: "Google's Gemini AI demonstrates breakthrough in mathematical reasoning",
    summary: "Google DeepMind has released a research paper detailing how its Gemini AI model has achieved significant advances in mathematical reasoning capabilities. The model demonstrated the ability to solve complex mathematical problems, including calculus, linear algebra, and probability theory questions at a level approaching human mathematicians. Researchers credit the breakthrough to a novel training approach combining large language model capabilities with specialized mathematical reasoning frameworks.",
    canonical: "https://ai.googleblog.com/2023/12/advances-in-mathematical-reasoning-with-gemini.html",
    preview: "https://media-cldnry.s-nbcnews.com/image/upload/t_fit-1000w,f_auto,q_auto:best/rockcms/2025-01/250108-aging-america-lr-992b1c.jpg",
    pub_time: "2023-12-07T18:45:00",
    author: "Google DeepMind Team",
    source: "Google AI Blog",
    genre: "Science & Technology",
    aboutness: "Advances in AI mathematical capabilities",
    positive_ratings: 945,
    negative_ratings: 42,
    shares: 789,
    tips: 178,
    adoption_count: 332,
    traders: 156,
    current_value: 3.45,
    trending: 'up'
  },
  {
    uuid: "mockid4",
    title: "Brazil advances to Copa América final after defeating Uruguay",
    summary: "The Brazilian national football team has secured their place in the Copa América final after defeating Uruguay 2-0 in a tense semifinal match. Goals from Vinícius Júnior and Rodrygo secured the victory, while goalkeeper Alisson made several crucial saves to maintain the clean sheet. Brazil will face Argentina in the final, setting up a highly anticipated clash between the South American rivals for continental supremacy.",
    canonical: "https://www.espn.com/soccer/report/_/gameId/687421",
    preview: "https://a3.espncdn.com/combiner/i?img=%2Fphoto%2F2025%2F0305%2Fr1459895_1296x729_16%2D9.jpg&w=1140&cquality=40&format=jpg",
    pub_time: "2023-07-07T23:15:00",
    author: "ESPN Staff",
    source: "ESPN",
    genre: "Sports",
    aboutness: "Copa América semifinal results",
    positive_ratings: 1238,
    negative_ratings: 143,
    shares: 856,
    tips: 312,
    adoption_count: 174,
    traders: 89,
    current_value: 1.92,
    trending: 'stable'
  },
  {
    uuid: "mockid5",
    title: "Financial markets react to BRICS expansion",
    summary: "Global financial markets are closely monitoring the potential expansion of the BRICS economic alliance, as several countries have formally applied to join the bloc. Analysts suggest that an expanded BRICS could challenge the dominance of Western-led financial institutions and potentially create alternative payment systems that reduce dependence on the US dollar for international trade.",
    canonical: "https://www.globalcapital.com/globalmarkets/article/2cax996q6pc1sdrkzzg8w/final-word-if-the-brics-expands-it-needs-a-clear-purpose",
    preview: "https://assets.euromoneydigital.com/dims4/default/0fea50d/2147483647/strip/true/crop/575x302+0+37/resize/1200x630!/quality/90/?url=http%3A%2F%2Feuromoney-brightspot.s3.amazonaws.com%2F7e%2F76%2F05fd75304af4a29660028f774610%2Fimf23-official-portrait-of-lord-oneill-of-gatley.jpg",
    author: "Financial Analyst Team",
    source: "Global Capital",
    genre: "Finance",
    aboutness: "BRICS economic alliance expansion",
    positive_ratings: 527,
    negative_ratings: 183,
    shares: 412,
    tips: 105,
    adoption_count: 243,
    traders: 132,
    current_value: 1.65,
    trending: 'up'
  },
  {
    uuid: "mockid6",
    title: "Archaeologists discover 2,300-year-old Mayan palace in Mexico",
    summary: "A team of archaeologists from Mexico's National Institute of Anthropology and History (INAH) has uncovered a well-preserved Mayan palace complex dating back approximately 2,300 years in the Yucatán Peninsula. The structure, measuring over 55 meters long and 15 meters wide, is believed to have been a royal residence and administrative center during the Late Preclassic period. The discovery includes elaborate stucco decorations, hieroglyphic inscriptions, and burial chambers that provide new insights into early Mayan political organization and artistic achievements.",
    canonical: "https://www.inah.gob.mx/boletines/descubren-palacio-maya-de-2300-anos-de-antiguedad-en-yucatan",
    preview: "https://f3b9m7v4.rocketcdn.me/wp-content/uploads/2024/10/USChina-war-2027.jpg",
    pub_time: "2023-11-28T10:20:00",
    author: "INAH Archaeological Team",
    source: "Instituto Nacional de Antropología e Historia",
    genre: "Archaeology",
    aboutness: "Ancient Mayan archaeological discovery",
    positive_ratings: 738,
    negative_ratings: 25,
    shares: 421,
    tips: 187,
    adoption_count: 265,
    traders: 43,
    current_value: 2.15,
    trending: 'stable'
  },
  {
    uuid: "mockid7",
    title: "New breakthrough in renewable energy storage announced",
    summary: "Scientists at MIT have developed a novel energy storage system that could solve one of the biggest challenges in renewable energy adoption. The new technology uses abundant, non-toxic materials to store electricity from intermittent sources like solar and wind for weeks rather than hours, potentially transforming the economics of renewable energy deployment worldwide.",
    canonical: "https://news.mit.edu/2023/new-energy-storage-breakthrough",
    preview: "https://news.mit.edu/sites/default/files/styles/news_article__image_gallery/public/images/202212/MIT-Energy-Storage-01-press.jpg?itok=tJI5VRQV",
    pub_time: "2023-09-15T08:30:00",
    author: "MIT Energy Initiative",
    source: "MIT News",
    genre: "Science & Technology",
    aboutness: "Renewable energy storage breakthrough",
    positive_ratings: 892,
    negative_ratings: 34,
    shares: 651,
    tips: 212,
    adoption_count: 317,
    traders: 138,
    current_value: 2.87,
    trending: 'up'
  },
  {
    uuid: "mockid8",
    title: "Global summit addresses climate migration challenges",
    summary: "A first-of-its-kind international summit has concluded with new agreements on managing climate-driven migration, as rising sea levels and extreme weather events force millions to relocate. The framework includes provisions for legal recognition of climate refugees, financial support for affected communities, and guidelines for planned relocations of vulnerable populations.",
    canonical: "https://www.un.org/climate/summit/2023/migration",
    preview: "https://www.unhcr.org/content/dam/unhcr/Global%20Site/homepage-redesign/2022/content-modules/Climate%20Change%20%26%20Disaster%20Displacement/Somalia/Climate%20Change%20and%20Disaster%20Displacement%20banner%20Somalia.jpg/jcr:content/renditions/cq5dam.web.1440.960.jpegv3",
    pub_time: "2023-10-05T16:45:00",
    author: "UN Climate Summit",
    source: "United Nations",
    genre: "Environment",
    aboutness: "Climate migration policy",
    positive_ratings: 635,
    negative_ratings: 187,
    shares: 423,
    tips: 156,
    adoption_count: 289,
    traders: 94,
    current_value: 1.78,
    trending: 'stable'
  },
  {
    uuid: "mockid9",
    title: "New AI tool revolutionizes drug discovery process",
    summary: "Pharmaceutical researchers have unveiled a new artificial intelligence system that has successfully predicted molecular structures for potential treatments of previously 'undruggable' diseases. The tool identified several promising compounds for treating ALS that are now moving to preclinical testing, with researchers estimating it could shave years off traditional drug development timelines.",
    canonical: "https://www.nature.com/articles/s41586-023-06145-x",
    preview: "https://media.nature.com/lw767/magazine-assets/d41586-023-00107-z/d41586-023-00107-z_23881542.jpg",
    pub_time: "2023-07-28T09:15:00",
    author: "Nature Research Team",
    source: "Nature",
    genre: "Health & Technology",
    aboutness: "AI in pharmaceutical research",
    positive_ratings: 874,
    negative_ratings: 51,
    shares: 492,
    tips: 208,
    adoption_count: 326,
    traders: 167,
    current_value: 3.12,
    trending: 'up'
  }
];

const NewsCard = React.forwardRef(({ news, isActive, onClick, style, isMobile, gridPosition, children }, ref) => {
  // Handle trading actions
  const handleLongPosition = (e) => {
    e.stopPropagation();
    console.log('Long position on', news.title);
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };
  
  const handleShortPosition = (e) => {
    e.stopPropagation();
    console.log('Short position on', news.title);
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
  
  // For desktop card, return horizontal layout
  if (!isMobile && isActive) {
    return (
      <div 
        ref={ref}
        className={cardClasses} 
        onClick={handleCardClick} 
        style={style}
      >
        <div className="desktop-active-layout">
          <div className="active-image">
            <img src={news.preview} alt={news.title} onError={(e) => e.target.src = '/static/3d.webp'} />
          </div>
          <div className="active-content">
            <div className="card-source">
              <img src={getFaviconUrl(news.canonical, 16)} alt={news.source} className="source-favicon" />
              <span className="text-white">{news.source}</span>
              <span className="genre-badge genre-badge-active">{news.genre}</span>
            </div>
            <h3 className="card-title text-white">{news.title}</h3>
            <p className="card-summary text-white">{news.summary}</p>
            
            <div className="card-metrics">
              <div className="metric">
                <span className="metric-icon">👍</span>
                <span className="metric-value text-white">{news.positive_ratings}</span>
              </div>
              <div className="metric">
                <span className="metric-icon">👎</span>
                <span className="metric-value text-white">{news.negative_ratings}</span>
              </div>
              <div className="metric">
                <span className="metric-icon">🔖</span>
                <span className="metric-value text-white">{news.adoption_count}</span>
              </div>
              <div className="metric">
                <span className="metric-icon">💰</span>
                <span className="metric-value text-white">{news.tips}</span>
              </div>
              <div className={`metric ${trendingClass}`}>
                <span className="metric-icon">📈</span>
                <span className="metric-value text-white">
                  ${news.current_value} {trendingArrow}
                </span>
              </div>
            </div>
          </div>
          {children}
        </div>
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
          <span className="text-white">{news.source}</span>
          <span className="genre-badge genre-badge-active">{news.genre}</span>
        </div>
        <h3 className="card-title text-white">{news.title}</h3>
        <p className="card-summary text-white">{news.summary}</p>
        
        <div className="card-metrics">
          <div className="metric">
            <span className="metric-icon">👍</span>
            <span className="metric-value text-white">{news.positive_ratings}</span>
          </div>
          <div className="metric">
            <span className="metric-icon">📊</span>
            <span className="metric-value text-white">
              <b>${news.current_value}</b> {trendingArrow}
            </span>
          </div>
          <div className="metric">
            <span className="metric-icon">👥</span>
            <span className="metric-value text-white">{news.traders}</span>
          </div>
        </div>
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
      
      <div className="fullscreen-header" style={{ background: getCategoryColor(news.genre) }}>
        <div className="header-content">
          <div className="site-logo" onClick={onClose}>
            <img src="/static/logo.svg" alt="Here.news" />
            <span>HERE.NEWS</span>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
      </div>
      
      {isMobile ? (
        // Mobile layout with swipeable sections
        <div className="fullscreen-content">
          {/* First section: Article content */}
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
              <span className="genre-badge">{news.genre}</span>
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
            
            <div className="swipe-hint" style={{ textAlign: 'center', marginTop: 30, color: '#999' }}>
              Swipe up for actions ↓
            </div>
          </section>
          
          {/* Second section: Actions and Trading */}
          <section className="fullscreen-section">
            <h2 style={{ marginTop: 40, marginBottom: 20 }}>Actions & Trading</h2>
            
            <div className="action-toolbar">
              <button className="action-button">
                <span className="action-icon">👍</span>
                <span className="action-label">Upvote</span>
                <span className="action-count">{news.positive_ratings}</span>
              </button>
              <button className="action-button">
                <span className="action-icon">👎</span>
                <span className="action-label">Downvote</span>
                <span className="action-count">{news.negative_ratings}</span>
              </button>
              <button className="action-button">
                <span className="action-icon">🔖</span>
                <span className="action-label">Adopt</span>
                <span className="action-count">{news.adoption_count}</span>
              </button>
              <button className="action-button">
                <span className="action-icon">💰</span>
                <span className="action-label">Tip</span>
                <span className="action-count">{news.tips}</span>
              </button>
              <button className="action-button">
                <span className="action-icon">🔄</span>
                <span className="action-label">Share</span>
                <span className="action-count">{news.shares}</span>
              </button>
            </div>
            
            <div className="trading-section">
              <h3>Content Trading</h3>
              <div className="trading-stats">
                <div className="trading-stat">
                  <span className="stat-label">Current Value:</span>
                  <span className={`stat-value ${trendingClass}`}>${news.current_value} {trendingArrow}</span>
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
            <span className="genre-badge">{news.genre}</span>
            <span className="publish-date">Published: {new Date(news.pub_time).toLocaleDateString()}</span>
            <span className="author">By {news.author}</span>
          </div>
          <h1 className="fullscreen-title">{news.title}</h1>
          <p className="fullscreen-summary">{news.summary}</p>
          
          <div className="action-toolbar">
            <button className="action-button">
              <span className="action-icon">👍</span>
              <span className="action-label">Upvote</span>
              <span className="action-count">{news.positive_ratings}</span>
            </button>
            <button className="action-button">
              <span className="action-icon">👎</span>
              <span className="action-label">Downvote</span>
              <span className="action-count">{news.negative_ratings}</span>
            </button>
            <button className="action-button">
              <span className="action-icon">🔖</span>
              <span className="action-label">Adopt</span>
              <span className="action-count">{news.adoption_count}</span>
            </button>
            <button className="action-button">
              <span className="action-icon">💰</span>
              <span className="action-label">Tip</span>
              <span className="action-count">{news.tips}</span>
            </button>
            <button className="action-button">
              <span className="action-icon">🔄</span>
              <span className="action-label">Share</span>
              <span className="action-count">{news.shares}</span>
            </button>
          </div>
          
          <div className="trading-section">
            <h3>Content Trading</h3>
            <div className="trading-stats">
              <div className="trading-stat">
                <span className="stat-label">Current Value:</span>
                <span className={`stat-value ${trendingClass}`}>${news.current_value} {trendingArrow}</span>
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
  );
};

const NewsColossal = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [news, setNews] = useState([]);
  const [fullScreenNews, setFullScreenNews] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  
  // Fetch news from API with console logging for debugging
  const fetchTopNews = async () => {
    setIsLoading(true);
    
    console.log('Fetching news from API...', serviceUrl);
    
    try {
      // Use the topnews endpoint as specified
      console.log('Fetching from /topnews endpoint');
      const response = await fetch(`${serviceUrl}/topnews?range=2h&limit=9`);
      
      if (!response.ok) {
        throw new Error(`Error fetching news: ${response.status} ${response.statusText}`);
      }
      
      let data = await response.json();
      console.log('Raw API response:', data);
      
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
      
      console.log('Processed news array:', fetchedNews);
      
      if (!Array.isArray(fetchedNews) || fetchedNews.length === 0) {
        console.error('Could not extract news array from API response');
        throw new Error('Could not extract news array from API response');
      }
      
      // Add trading-related mock data for prototype
      fetchedNews = fetchedNews.map(item => ({
        ...item,
        positive_ratings: item.positive_ratings || Math.floor(Math.random() * 1000) + 100,
        negative_ratings: item.negative_ratings || Math.floor(Math.random() * 200) + 20,
        shares: Math.floor(Math.random() * 800) + 100,
        tips: Math.floor(Math.random() * 300) + 30,
        adoption_count: Math.floor(Math.random() * 400) + 50,
        traders: Math.floor(Math.random() * 150) + 20,
        current_value: (Math.random() * 3 + 0.5).toFixed(2),
        trending: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)]
      }));
      
      console.log('Enhanced news with trading data:', fetchedNews);
      setNews(fetchedNews);
    } catch (error) {
      console.error('Error fetching news:', error);
      // Fallback to sample data if API fails
      console.log('Falling back to sample data');
      setNews(realNews);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch news details for a specific article
  const fetchNewsDetails = async (uuid) => {
    try {
      console.log(`Making fetch request to ${serviceUrl}/news/${uuid}`);
      const response = await fetch(`${serviceUrl}/news/${uuid}`);
      
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Raw news details from API:', data);
      
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
      
      console.log('Processed news details:', newsDetails);
      
      if (!newsDetails || Object.keys(newsDetails).length === 0) {
        console.error('Empty news details returned');
        throw new Error('Empty news details returned');
      }
      
      // Add trading-related mock data
      const enhancedNewsDetails = {
        ...newsDetails,
        positive_ratings: newsDetails.positive_ratings || Math.floor(Math.random() * 1000) + 100,
        negative_ratings: newsDetails.negative_ratings || Math.floor(Math.random() * 200) + 20,
        shares: Math.floor(Math.random() * 800) + 100,
        tips: Math.floor(Math.random() * 300) + 30,
        adoption_count: Math.floor(Math.random() * 400) + 50,
        traders: Math.floor(Math.random() * 150) + 20,
        current_value: (Math.random() * 3 + 0.5).toFixed(2),
        trending: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)]
      };
      
      console.log('Enhanced news details:', enhancedNewsDetails);
      return enhancedNewsDetails;
    } catch (error) {
      console.error(`Error fetching details for news ${uuid}:`, error);
      return null;
    }
  };
  
  useEffect(() => {
    fetchTopNews();

    // Prevent default scrolling on mobile
    if (isMobile && containerRef.current) {
      containerRef.current.style.overscrollBehavior = 'none';
      containerRef.current.style.touchAction = 'none';
    }
  }, [isMobile]);

  // Ensure isMobile state is consistently applied and updated
  useEffect(() => {
    const handleResize = () => {
      const mobileView = window.innerWidth <= 768;
      console.log('Screen width:', window.innerWidth, 'Mobile:', mobileView);
      setIsMobile(mobileView);
      
      // Force apply mobile styles to body for cascade
      if (mobileView) {
        document.body.classList.add('mobile-view');
      } else {
        document.body.classList.remove('mobile-view');
      }
    };
    
    // Initial check
    handleResize();
    
    // Listen for changes
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCardClick = async (uuid) => {
    const index = news.findIndex(item => item.uuid === uuid);
    if (index !== activeIndex) {
      setActiveIndex(index);
    } else {
      // When opening fullscreen, fetch detailed news if available
      setIsLoading(true);
      try {
        console.log(`Fetching detailed news for UUID: ${uuid}`);
        const detailedNews = await fetchNewsDetails(uuid);
        console.log('Fetched detailed news:', detailedNews);
        
        if (detailedNews) {
          setFullScreenNews(detailedNews);
        } else {
          // Fallback to the news we already have
          console.log('No detailed news found, using existing news item');
          setFullScreenNews(news[index]);
        }
      } catch (error) {
        console.error('Error fetching detailed news:', error);
        console.log('Error in fetch, using existing news item');
        setFullScreenNews(news[index]);
      } finally {
        setIsLoading(false);
      }
    }
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
    
    // Only prevent swiping on buttons and trading actions
    const target = e.target;
    const isInteractive = 
      target.closest('.card-trading-actions') ||
      target.closest('button');
    
    // Allow swiping on card content, just prevent if we're on an interactive element
    setIsCardContentScrolling(isInteractive);
    console.log('Touch start at Y:', e.touches[0].clientY, 'Is interactive:', isInteractive);
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
      // Prevent browser's default behavior (scrolling)
      e.preventDefault();
      
      // Track swipe state
      if (!isSwiping) {
        setIsSwiping(true);
        console.log('Swipe detected, direction:', deltaY > 0 ? 'down' : 'up');
      }
      
      // Visual feedback - move card with finger
      const activeCard = document.querySelector('.news-card.active');
      if (activeCard) {
        // Apply transform directly to follow finger (with resistance)
        const resistance = 0.3; // Lower = more resistance
        const translateY = deltaY * resistance;
        activeCard.style.transform = `translateY(${translateY}px)`;
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
      
      console.log('Swipe ended, distance:', swipeDistance);
      
      // If swipe distance is significant enough, change card
      if (Math.abs(swipeDistance) > minSwipeDistance) {
        // Provide haptic feedback
        provideHapticFeedback();
        
        if (swipeDistance > 0 && activeIndex > 0) {
          // Swiped DOWN = go to PREVIOUS card
          console.log('Navigating to previous card (index ' + (activeIndex-1) + ')');
          setActiveIndex(activeIndex - 1);
        } else if (swipeDistance < 0 && activeIndex < news.length - 1) {
          // Swiped UP = go to NEXT card
          console.log('Navigating to next card (index ' + (activeIndex+1) + ')');
          setActiveIndex(activeIndex + 1);
        } else {
          console.log('At edge of cards, cannot navigate further');
        }
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
  
  return (
    <div className="news-colossal-container">
      
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      
      {/* Fixed header for mobile */}
      {isMobile && (
        <div className="news-header-mobile">
          <div className="logo">
            <img src="/static/logo.svg" alt="Here News" height="30" />
          </div>
          <h1 style={{fontSize: '18px', margin: '0 auto'}}>HERE.NEWS</h1>
          <div style={{width: '30px'}}></div>
        </div>
      )}
      
      {/* Progress indicator removed as requested */}
      
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
              // Active card - centered
              cardStyle = {
                transform: 'translateY(0)',
                zIndex: 10,
                opacity: 1,
                visibility: 'visible',
                position: 'absolute',
                top: '60px',
                left: 0,
                right: 0,
                width: '100%',
                height: 'calc(100vh - 60px)',
                margin: 0,
                padding: 0,
                borderRadius: 0,
                background: getGenreBackground(item.genre), // Use item.genre instead of news.genre
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column'
              };
            } else if (relativePosition === -1) {
              // Previous card (above) - nearly invisible (just a tiny hint)
              cardStyle = {
                transform: 'translateY(-98%)',
                zIndex: 9,
                opacity: 0.6,
                visibility: 'visible',
                pointerEvents: 'none',
                position: 'absolute',
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
              // Next card (below) - nearly invisible (just a tiny hint)
              cardStyle = {
                transform: 'translateY(98%)',
                zIndex: 8,
                opacity: 0.6,
                visibility: 'visible',
                pointerEvents: 'none',
                position: 'absolute',
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
              // Other cards - hidden off-screen
              cardStyle = {
                transform: relativePosition < 0 
                  ? 'translateY(-120%)' 
                  : 'translateY(120%)',
                zIndex: 5,
                opacity: 0,
                visibility: 'hidden',
                pointerEvents: 'none',
                position: 'absolute',
                top: '60px',
                left: 0,
                right: 0,
                width: '100%',
                margin: 0,
                padding: 0,
                borderRadius: 0
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
            // Desktop grid layout
            if (index === activeIndex) {
              gridPosition = 'center';
              cardStyle.zIndex = news.length;
            } else {
              const positions = [
                'center', 'top', 'top-right', 'right', 'bottom-right',
                'bottom', 'bottom-left', 'left', 'top-left'
              ];
              
              // Determine relative position (modulo to wrap around)
              const relativePos = ((index - activeIndex) + 9) % 9;
              gridPosition = positions[relativePos];
              cardStyle.zIndex = news.length - Math.abs(index - activeIndex);
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
      
      {/* Only show controls for desktop */}
      {!isMobile && (
        <div className="carousel-controls">
          <button 
            className="control-button prev"
            onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
          >
            ←
          </button>
          <button 
            className="control-button next"
            onClick={() => setActiveIndex(Math.min(news.length - 1, activeIndex + 1))}
            disabled={activeIndex === news.length - 1}
          >
            →
          </button>
        </div>
      )}
      
      {/* Removed progress indicators as requested */}
      
      {/* Global trading actions - always visible on mobile, more compact design */}
      {isMobile && news.length > 0 && ReactDOM.createPortal(
        <div className="global-trading-actions">
          <div className="price-display">
            <span className="price-label">Price</span>
            <span className="price-value">${news[activeIndex]?.current_value || '0.00'}</span>
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
    </div>
  );
};

export default NewsColossal;