import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import serviceUrl from './config';
import './Comments.css';

const Comments = ({ entityId }) => {
  const { publicKey, openModal } = useUser();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetch(`${serviceUrl}/news/${entityId}/comments`)
      .then(response => response.json())
      .then(data => setComments(data))
      .catch(error => console.error('Error fetching comments:', error));
  }, [entityId]);

  const handleCommentSubmit = () => {
    if (newComment.trim() === '') return;

    fetch(`${serviceUrl}/news/${entityId}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: newComment, user_id: publicKey }), // Assuming user_id is static for now
    })
      .then(response => response.json())
      .then(data => setComments(prevComments => [...prevComments, data]))
      .catch(error => console.error('Error posting comment:', error));

    setNewComment('');
  };

  const handleUpvote = (commentId) => {
    fetch(`${serviceUrl}/comments/${commentId}/upvote`, {
      method: 'POST',
    })
      .then(response => response.json())
      .then(data => {
        setComments(prevComments =>
          prevComments.map(comment =>
            comment.id === commentId ? { ...comment, upvotes: comment.upvotes + 1 } : comment
          )
        );
      })
      .catch(error => console.error('Error upvoting comment:', error));
  };

  return (
    <div className="comments-section">
      <a name="comments"></a>
      <h3>Comments</h3>
      <textarea
        value={newComment}
        onChange={e => setNewComment(e.target.value)}
        placeholder="Add a comment..."
      />
      <button onClick={handleCommentSubmit}>Submit</button>
      <a name="comments-list"></a>
      <div className="comments-list">
        {comments.map(comment => (
          <div key={comment.id} className="comment">
            <p>{comment.text}</p>
            <div className="comment-actions">
              <span> </span>
              <button onClick={() => handleUpvote(comment.id)}>👍({comment.upvotes})</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Comments;
