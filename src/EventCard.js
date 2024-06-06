import React, { useState } from 'react';
import VoteButton from './ButtonVote';

const EventCard = ({ event }) => {
  const [isReplyFormVisible, setReplyFormVisible] = useState(false);
  const [upvotes, setUpvotes] = useState(event.upvotes);
  const [downvotes, setDownvotes] = useState(event.downvotes);

  const toggleReplyForm = () => {
    setReplyFormVisible(!isReplyFormVisible);
  };

  return (
    <div className={`event-card ${event.type}-event`}>
      <div className="event-meta">
        <div className="avatar-small">
          {event.avatar && <img src={event.avatar} alt="Avatar" />}
        </div>
        <div className="event-details">
          <span>{event.date}</span>
          <b>{event.author}</b>
        </div>
      </div>
      <div className="event-content">
        <p>{event.content}</p>
      </div>
      <div className="comment-icons">
      <button id="comment-story-btn" className="btn btn-sm btn-outline-primary" onClick={toggleReplyForm}>💬 <span id="comment-count">27</span></button>
        <VoteButton type="upvote" initialCount={upvotes} storyId={event.id} icon="▲" />
        <VoteButton type="downvote" initialCount={downvotes} storyId={event.id} icon="▼" />
      </div>
      {isReplyFormVisible && (
        <div className="reply-form">
          <form>
            <textarea className="form-control" placeholder="Type a reply..."></textarea>
            <button className="btn btn-outline-secondary" type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default EventCard;
