import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import serviceUrl from './config';
import Header from './Header';
import VoteButton from './ButtonVote';
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
            <p>{news.pub_time} by <b>{news.source}</b></p>
            <p>
              <a href={news.canonical}>{news.canonical}</a> (paywall? cache 
              <a href={`http://web.archive.org/web/2/${news.canonical}`}>1</a>, 2...)
            </p>
            <p><b><u>Summary</u>:</b> {news.summary}</p>
            <div className="vote-buttons">
              <VoteButton type="up" initialCount={223} storyId={news.uuid} icon="👍" />
              <VoteButton type="down" initialCount={73} storyId={news.uuid} icon="👎" />
              <button className="btn btn-sm btn-outline-primary">💬 12</button>
              <span>(Upvotes go to the news outlet; downvotes go to community validators)</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default News;
