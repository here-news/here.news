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
  const [showIframe, setShowIframe] = useState(false);

  useEffect(() => {
    fetch(`${serviceUrl}/news/${uuid}`)
      .then(response => response.json())
      .then(data => setNews(data))
      .catch(error => console.error('Error fetching news:', error));
  }, [uuid]);

  

  if (!news) {
    return <div>Loading...</div>;
  }

  const handleUrlClick = (event) => {
    event.preventDefault();
    setShowIframe(true);
  };

  const closeIframe = () => {
    setShowIframe(false);
  };

  const openInNewTab = () => {
    setShowIframe(false)
    window.open(news.canonical, '_blank');
  
  };


  return (
    <>
      <Header />
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <img src={news.preview || '/static/3d.webp'} className="news-image" onError={(e) => e.target.src = '/static/hats.webp'} />
            <h1>{news.title}</h1>
            <p>{news.pub_time} by {news.author} <img src={getFaviconUrl(news.canonical,28)}></img> <b><a href={`/outlet/${news.source_id}`}>{news.source}</a></b></p>
            <p><b><u>Summary</u>:</b> {news.summary} </p>
            <p> ➡️ <a target="_blank" href={news.canonical} onClick={handleUrlClick}>{news.canonical}</a> </p>
            <p><b>Please read the original article and rate it below. </b>(can't read? <span>Try</span> peer sharing request.)</p>

            <RatingBar positive={news.positive_ratings} negative={news.negative_ratings} displayNumber={false} tartget='#comments-list'/>
            <ButtonVote type="up" initialCount={news.positive_ratings} newsId={news.uuid} icon="👍" />
              <ButtonVote type="down" initialCount={news.negative_ratings} newsId={news.uuid} icon="👎" />

          </div>
        </div>
      </div>
      {showIframe && (
        <div className="iframe-popup">
        <div className="iframe-popup-content">
          <div className="iframe-popup-header">
            <button onClick={closeIframe} className="close-button">✖</button>
            <button onClick={openInNewTab} className="open-button">Open in new tab</button>
          </div>
          <iframe src={news.canonical} title="News Source"></iframe>
        </div>
      </div>
      )}
    </>
  );
};

export default News;
