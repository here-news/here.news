import React from 'react';
import getFaviconUrl from '../util';
import '../GenreBadges.css'; // Import the unified genre badge styling
import './CardTitle.css'; // Import the centralized card title styling

// New custom CardTitle component for better title management
const CardTitle = ({ title, className, size = 'medium', lines = 2, onClick }) => {
  const sizeClasses = {
    large: 'card-title-large',
    medium: 'card-title-medium',
    small: 'card-title-small',
    featured: 'card-title-featured'
  };

  const lineClampClass = `line-clamp-${lines}`; // Add a class for line clamping

  return (
    <h2 
      className={`card-title ${sizeClasses[size] || ''} ${lineClampClass} ${className || ''}`}
      onClick={onClick}
    >
      {title}
    </h2>
  );
};

const NewsCard = React.forwardRef(({ news, isActive, onClick, style, isMobile, extraClasses, children }, ref) => {
  // Format belief ratio as percentage with more comprehensive parsing
  const beliefRatio = typeof news.belief_ratio === 'number' 
    ? news.belief_ratio 
    : typeof news.belief_ratio === 'string' 
      ? parseFloat(news.belief_ratio) 
      : 0.5;
  
  const beliefPercentage = Math.round(beliefRatio * 100);
  
  // Use the same thresholds as in NewsDetail/TradingPanel (>0.6, <0.4)
  const beliefClass = beliefRatio >= 0.6 ? 'high-belief' : 
                     beliefRatio >= 0.4 ? 'medium-belief' : 'low-belief';
  
  const handleCardClick = () => {
    onClick(news.uuid);
  };

  // Value indicator arrow based on trending direction
  const trendingArrow = news.trending === 'up' ? '↑' : news.trending === 'down' ? '↓' : '→';
  const trendingClass = `trending-${news.trending || 'stable'}`;
  
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
  }
  baseClasses.push(getGenreClass());
  baseClasses.push(beliefClass);
  
  // Add extra classes if provided
  if (extraClasses) {
    baseClasses.push(extraClasses);
  }
  
  const cardClasses = baseClasses.join(' ');
  
  // Standard desktop card
  if (!isMobile) {
    // Special layout for featured card
    if (extraClasses && extraClasses.includes('featured')) {
      return (
        <div 
          ref={ref}
          className={cardClasses} 
          onClick={handleCardClick} 
          style={style}
        >
          <div className="card-preview">
            <img src={news.preview} alt={news.title} onError={(e) => e.target.src = '/static/3d.webp'} />
            <div className="card-belief-section">
              <div className={`belief-indicator ${beliefClass}`}>
                <span className="belief-value">{beliefPercentage}%</span>
              </div>
            </div>
            <div className="featured-title-overlay">
              <CardTitle 
                title={news.title} 
                size="featured" 
                lines={3} 
                className="featured-title" 
              />
              <div className="featured-info-container">
                <div className="featured-info">
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
                  <div className="featured-metadata">
                    <div className="featured-date">{news.pub_time ? new Date(news.pub_time).toLocaleDateString() : ''}</div>
                    {news.author && <div className="featured-author">By {news.author}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {children}
        </div>
      );
    }
    
    // Regular card layout
    return (
      <div 
        ref={ref}
        className={cardClasses} 
        onClick={handleCardClick} 
        style={style}
      >
        <div className="card-preview">
          <img src={news.preview} alt={news.title} onError={(e) => e.target.src = '/static/3d.webp'} />
          <div className="card-belief-section">
            <div className={`belief-indicator ${beliefClass}`}>
              <span className="belief-value">{beliefPercentage}%</span>
            </div>
          </div>
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
          <CardTitle 
            title={news.title} 
            size={isActive ? "large" : "medium"} 
            lines={isActive ? 3 : 2} 
          />
          <p className="card-summary">{news.summary}</p>
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
        <div className="card-belief-section">
          <div className={`belief-indicator ${beliefClass}`}>
            <span className="belief-value">{beliefPercentage}%</span>
          </div>
        </div>
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
        <CardTitle 
          title={news.title} 
          size="large" 
          lines={3} 
        />
        <p className="card-summary">{news.summary}</p>
      </div>
      
      {children}
    </div>
  );
});

export default NewsCard;