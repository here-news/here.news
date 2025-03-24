import React from 'react';
import { useNavigate } from 'react-router-dom';
import getFaviconUrl from './util';
import './NewsColossal.css';

const NewsFullScreen = ({ news, onClose }) => {
  const navigate = useNavigate();
  
  if (!news) return null;
  
  const handleReadMore = () => {
    navigate(`/news/${news.uuid}`);
    onClose();
  };
  
  return (
    <div className="fullscreen-news-modal" onClick={onClose}>
      <div className="fullscreen-news-content" onClick={e => e.stopPropagation()}>
        <button className="fullscreen-close-button" onClick={onClose}>×</button>
        
        <div className="fullscreen-news-header">
          <img src={getFaviconUrl(news.canonical, 24)} alt={news.source} className="fullscreen-news-favicon" />
          <span className="fullscreen-news-source">{news.source}</span>
          <span className="fullscreen-news-date">{new Date(news.pub_time).toLocaleDateString()}</span>
        </div>
        
        <h2 className="fullscreen-news-title">{news.title}</h2>
        
        {news.preview && (
          <img 
            src={news.preview} 
            alt={news.title}
            className="fullscreen-news-image"
            onError={(e) => e.target.src = '/static/3d.webp'} 
          />
        )}
        
        <p className="fullscreen-news-summary">{news.summary}</p>
        
        <div className="fullscreen-news-actions">
          <button className="fullscreen-read-more" onClick={handleReadMore}>
            Read Full Article
          </button>
          
          <div className="fullscreen-metrics">
            <div className="fullscreen-metric">
              <span className="fullscreen-metric-icon">👍</span>
              <span className="fullscreen-metric-value">{news.positive_ratings || 0}</span>
            </div>
            <div className="fullscreen-metric">
              <span className="fullscreen-metric-icon">👎</span>
              <span className="fullscreen-metric-value">{news.negative_ratings || 0}</span>
            </div>
            <div className="fullscreen-metric">
              <span className="fullscreen-metric-icon">💲</span>
              <span className="fullscreen-metric-value">${news.current_value || '0.00'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsFullScreen;