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
        <img src={news.preview}/>
        <h6>{news.title}</h6>
        </a>
        <img src={getFaviconUrl(news.canonical, 20)} style={{ width: '20px', height: '20px' }} /> <span>{news.source}</span>
        <RatingBar positive={news.positive_ratings} negative={news.negative_ratings} />
      </div>
    </div>
  );

  return cardContent;
};

export default NewsCard;
