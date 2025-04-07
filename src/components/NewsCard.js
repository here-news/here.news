import React from 'react';
import getFaviconUrl from '../util';
import MiniPriceChart from './MiniPriceChart';

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

export default NewsCard;
