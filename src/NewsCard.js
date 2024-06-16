import React from 'react';
import './NewsCard.css';


const NewsCard = ({ news, className, highlight }) => {
  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (error) {
      console.error('Invalid URL:', error);
      return '/path/to/default/favicon.ico';
    }
  };

  const cardClasses = ['news-card', className];

  if (highlight) {
    console.log('highlight')
      cardClasses.push('highlight');
  }

  const cardContent = (
    <div className={cardClasses.join(' ')}>
      <div className="card-details">
        <a href={`/news/${news.uuid}`}>
        <img src={news.preview}/>
        <h6>{news.title}</h6>
        </a>
        <img src={getFaviconUrl(news.canonical)} style={{ width: '20px', height: '20px' }} /> <span>{news.source}</span>
      </div>
    </div>
  );

  return cardContent;
};

export default NewsCard;
