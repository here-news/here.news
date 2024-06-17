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
            <img src={news.preview} alt="News Image" className="news-image" />
            <h1>{news.title}</h1>
            <p>{news.pub_time} by <img src={getFaviconUrl(news.canonical)}></img> <b>{news.source}</b></p>
            <p>
              <a href={`/outlet/${news.source_id}`}>{news.source}</a> (paywall? cache 
              <a href={`http://web.archive.org/web/2/${news.canonical}`}>1</a>, 2...)
            </p>
            <RatingBar positive={news.positive_ratings} negative={news.negative_ratings} displayNumber={true}/>
            <p><b><u>Summary</u>:</b> {news.summary}</p>
            <div className="vote-buttons">
              <ButtonVote type="up" initialCount={news.positive_ratings} storyId={news.uuid} icon="👍" />
              <ButtonVote type="down" initialCount={news.negative_ratings} storyId={news.uuid} icon="👎" />
            </div>
            <Comments newsId={news.uuid} />
          </div>
        </div>
      </div>
    </>
  );
};

export default News;
