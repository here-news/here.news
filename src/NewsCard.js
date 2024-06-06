import React, { useState } from 'react';
import VoteButton from './ButtonVote';

const NewsCard = ({ news }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SPAN') {
      return;
    }
    setExpanded(!expanded);
  };

  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`; // sz=32 for 32x32 resolution
    } catch (error) {
      console.error('Invalid URL:', error);
      return '/path/to/default/favicon.ico';
    }
  };

  return (
    <div className={`news-card ${expanded ? 'expanded' : ''}`} onClick={toggleExpand}>
      <div className="row no-gutters">
        <div className="col-md-8">
          <div className="card-body">
            <div className="media">
              <img src={getFaviconUrl(news.canonical)} className="mr-3" alt="Media Icon" style={{ width: '32px', height: '32px' }} />
              <div className="media-body">
                <h5 className="card-title">{news.title}</h5>
                <p className="card-text">
                  <small className="text-muted">By {news.author} on {news.pub_time} <a href={news.canonical}>link</a></small>
                </p>
                {expanded && (
                  <>
                    <p className="card-text">{news.summary}</p>
                    <div className="d-flex align-items-center">
                      <button id="comment-news-btn" className="btn btn-sm btn-outline-primary">💬 <span id="comment-count">27</span></button>
                      <VoteButton type="upvote" initialCount={22} storyId={news.id} icon="▲" />
                      <VoteButton type="downvote" initialCount={33} storyId={news.id} icon="▼" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <img src={news.preview} className="card-img" alt={news.title} />
        </div>
      </div>
    </div>
  );
};

export default NewsCard;
