import React, { useState } from 'react';
import { useUser } from './UserContext';
import Login from './Login';

import serviceUrl from './config';

const ButtonVote = ({ type, initialCount, newsId, icon }) => {
  const { publicKey, openModal, fetchUserInfo } = useUser();
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = () => {
    if (!publicKey) {
      openModal();
      return;
    }
    setCount(count + 1); // Optimistically update the UI

    setIsLoading(true);

    fetch(`${serviceUrl}/vote/${newsId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming you have a token
      },
      body: JSON.stringify({ "news_id": newsId, "public_key": publicKey, "type": type }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          fetchUserInfo(publicKey);
          setIsLoading(false);
        } else {
          alert(data.message);
          setCount(count); // Revert to the original count if the vote was not successful
        }
      })
      .catch(() => {
        setCount(count); // Revert to the original count in case of error
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

export default ButtonVote;
