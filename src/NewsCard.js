import React from 'react';
import './NewsCard.css';


const NewsCard = ({ news, className, showAsLink, hoverDisplay }) => {
  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (error) {
      console.error('Invalid URL:', error);
      return '/path/to/default/favicon.ico';
    }
  };

  const cardContent = (
    <div className={`news-card ${className}`}>
      <div className="card-details">
        <a href={`/news/${news.uuid}`}>
        <img src={news.preview} alt={news.title}  />
        <h6>{news.title}</h6>
        </a>
        <img src={getFaviconUrl(news.canonical)} style={{ width: '20px', height: '20px' }} /> <span>{news.source}</span>
      </div>
    </div>
  );

  if (showAsLink) {
    return (
      <div>
        <a className="reference-link" onMouseOver={hoverDisplay}>{news.refIndex}</a>
        {cardContent}
      </div>
    );
  }

  return cardContent;
};

export default NewsCard;
