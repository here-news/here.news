import React, { useState } from 'react';
import { useUser } from './UserContext';
import Login from './Login';
import serviceUrl from './config';


const VoteButton = ({ type, initialCount, storyId, icon }) => {
  const { publicKey, openModal } = useUser();
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = () => {
    <Login />;
    if (!publicKey) {
      openModal();
      return;
    }

    setCount(count + 1); // Optimistically update the UI
    setIsLoading(true);

    const endpoint = serviceUrl + '/vote/'  + type + '/' + storyId ;
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming you have a token
      },
      body: JSON.stringify({ publicKey, type }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setCount(data.newCount);
        } else {
          alert(data.message);
          setCount(count); // Revert to the original count if the vote was not successful
        }
      })
      .catch(() => {
        alert('An error occurred. Please try again.');
        setCount(count); // Revert to the original count in case of error
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <button
      className="btn btn-sm btn-outline-primary"
      onClick={handleVote}
      disabled={isLoading}
    >
      {icon} <span>{count}</span>
    </button>
  );
};

export default VoteButton;
