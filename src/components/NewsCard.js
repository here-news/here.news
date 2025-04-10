import React from 'react';
import getFaviconUrl from '../util';

const NewsCard = React.forwardRef(({ news, isActive, onClick, style, isMobile, extraClasses, children }, ref) => {
  // Format belief ratio as percentage
  const beliefRatio = parseFloat(news.belief_ratio || 0.5);
  const beliefPercentage = Math.round(beliefRatio * 100);
  const beliefClass = beliefRatio >= 0.7 ? 'high-belief' : 
                     beliefRatio >= 0.5 ? 'medium-belief' : 'low-belief';
  
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
              <h2 className="card-title">{news.title}</h2>
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
          <h2 className="card-title">{news.title}</h2>
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
        <h2 className="card-title">{news.title}</h2>
        <p className="card-summary">{news.summary}</p>
      </div>
      
      {children}
    </div>
  );
});

export default NewsCard;