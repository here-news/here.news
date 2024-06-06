import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';

const CommentSection = ({ storyId }) => {
  const { publicKey } = useUser();  // Get publicKey and username from context
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  const serviceUrl = process.env.REACT_APP_SERVICE_URL || 'http://127.0.0.1:8282';

  useEffect(() => {
    fetch(`${serviceUrl}/comments?storyId=${storyId}`)
      .then(response => response.json())
      .then(data => setComments(data))
      .catch(error => console.error('Error fetching comments:', error));
  }, [storyId, serviceUrl]);

  const handleCommentChange = (e) => {
    setNewComment(e.target.value);
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim() === '') return; // Prevent submitting empty comments

    const commentData = { storyId, text: newComment, publicKey, replyTo: replyTo?.id || null };
    fetch(`${serviceUrl}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commentData)
    })
      .then(response => response.json())
      .then(comment => {
        setComments([...comments, { ...comment, avatarUrl: generateAvatarUrl(publicKey) }]);  // Update comments with new comment
        setNewComment('');  // Clear the input field
        setReplyTo(null);   // Clear the reply state
      })
      .catch(error => console.error('Error posting comment:', error));
  };

  const generateAvatarUrl = (key, size = 32) => {
    // Placeholder for avatar URL generation logic based on publicKey
    return `${serviceUrl}/avatar/${key}?format=png&size=${size}`;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const checkExpiration = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now - date) / (1000 * 60 * 60); // Difference in hours
    return diff > 24 ? 'Expired' : '';
  };

  const handleReplyClick = (comment) => {
    setReplyTo(comment);
  };

  return (
    <div id="comment-section" className="community-comments">
      <h3>Comments</h3>
      <div id="comments-container" className="comments-container">
        {comments.map((comment, index) => (
          <div key={index} className={`comment ${replyTo && replyTo.id === comment.id ? 'highlighted' : ''}`} onMouseEnter={() => setReplyTo(comment)} onMouseLeave={() => setReplyTo(null)}>
            <img
              src={generateAvatarUrl(comment.publicKey, 32)}
              alt="User Avatar"
              style={{ width: '32px', height: '32px', borderRadius: '50%' }}
            />
            <div className="comment-body">
              <div className="comment-header">
                <span className="comment-author">
                  {comment.username || shortenPublicKey(comment.publicKey)}
                </span>
                <span className="comment-timestamp">
                  {formatTimestamp(comment.timestamp)}
                </span>
                {checkExpiration(comment.timestamp) === '' && (
                  <span className="comment-icons">
                    <span className="reply-icon" onClick={() => handleReplyClick(comment)}>↩️</span>
                    <span className="upvote-icon">▲ {comment.upvotes}</span>
                    <span className="downvote-icon">▼ {comment.downvotes}</span>
                  </span>
                )}
              </div>
              <p className="comment-text">{comment.text}</p>
              {comment.replies && comment.replies.map((reply, index) => (
                <div key={index} className="comment-reply">
                  <img
                    src={generateAvatarUrl(reply.publicKey, 16)}
                    alt="User Avatar"
                    style={{ width: '16px', height: '16px', borderRadius: '50%' }}
                  />
                  <div className="reply-body">
                    <div className="reply-header">
                      <span className="reply-author">
                        {reply.username || shortenPublicKey(reply.publicKey)}
                      </span>
                      <span className="reply-timestamp">
                        {formatTimestamp(reply.timestamp)}
                      </span>
                    </div>
                    <p className="reply-text">{reply.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {replyTo && (
        <div className="replying-to">
          <img
            src={generateAvatarUrl(replyTo.publicKey, 16)}
            alt="User Avatar"
            style={{ width: '16px', height: '16px', borderRadius: '50%' }}
          />
          <span>{replyTo.username || shortenPublicKey(replyTo.publicKey)}</span>
          <p>{replyTo.text}</p>
        </div>
      )}
      <form onSubmit={handleCommentSubmit}>
        <textarea
          className="form-control"
          placeholder="Type a message..."
          value={newComment}
          onChange={handleCommentChange}
        ></textarea>
        <button className="btn btn-outline-secondary" type="submit">
          Send
        </button>
      </form>
    </div>
  );
};

export default CommentSection;
