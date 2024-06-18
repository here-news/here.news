import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import serviceUrl from './config';
import Header from './Header';
import ButtonVote from './ButtonVote';
import RatingBar from './RatingBar';
import Comments from './Comments';
import getFaviconUrl from "./util"
import './News.css';

const News = () => {
  const [news, setNews] = useState(null);
  const { uuid } = useParams();

  useEffect(() => {
    fetch(`${serviceUrl}/news/${uuid}`)
      .then(response => response.json())
      .then(data => setNews(data))
      .catch(error => console.error('Error fetching news:', error));
  }, [uuid]);

  if (!news) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Header />
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <img src={news.preview || '/static/3d.webp'} className="news-image" onError={(e) => e.target.src = '/static/hats.webp'} />
            <p>    
            🔗 <a href={news.canonical}>{news.canonical}</a> (Can't read it? )
            </p>
            <h1>{news.title}</h1>
            <p>{news.pub_time} by {news.author} <img src={getFaviconUrl(news.canonical,28)}></img> <b><a href={`/outlet/${news.source_id}`}>{news.source}</a></b></p>
            <p><b><u>Summary</u>:</b> {news.summary} </p>

            <RatingBar positive={news.positive_ratings} negative={news.negative_ratings} displayNumber={true} tartget='#comments-list'/>
            <Comments entityId={news.uuid} />
          </div>
        </div>
      </div>
    </>
  );
};

export default News;
