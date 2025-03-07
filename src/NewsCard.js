import React from 'react';
import RatingBar from './RatingBar'
import getFaviconUrl from './util';
import './NewsCard.css';

const NewsCard = ({ news, className, highlight }) => {
  const cardClasses = ['news-card', className];

  if (highlight) {
      cardClasses.push('highlight');
  }

  const cardContent = (
    <div className={cardClasses.join(' ')}>
      <div className="card-details">
        <a href={`/news/${news.uuid}`}>
        <img src={news.preview || '/static/3d.webp'} className="news-image" onError={(e) => e.target.src = '/static/3d.webp'} />
        <h6>{news.title}</h6>
        </a>
        <RatingBar positive={news.positive_ratings} negative={news.negative_ratings}/>
        <img src={getFaviconUrl(news.canonical, 20)} style={{ width: '20px', height: '20px' }} /> <span>{news.source}</span>
      </div>
    </div>
  );

  return cardContent;
};

export default NewsCard;
