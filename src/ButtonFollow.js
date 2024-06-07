import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import Login from './Login';
import serviceUrl from './config';
import './ButtonFollow.css';  // Import the CSS file

const FollowButton = ({ storyId, icon }) => {
  const { publicKey, openModal, userInfo, setUserInfo } = useUser();
  const [count, setCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    // Fetch the follow count for the story
    const fetchFollowCount = async () => {
      const endpoint = `${serviceUrl}/follow/${storyId}/count`;
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        if (data.success) {
          setCount(data.new_count);
        } else {
          alert(data.message);
        }
      } catch (error) {
        alert('An error occurred. Please try again.');
      }
    };

    // Fetch the follow status for the current user
    const fetchFollowStatus = async () => {
      if (publicKey) {
        const endpoint = `${serviceUrl}/follow/${storyId}/${publicKey}`;
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });
          const data = await response.json();
          if (data.success) {
            setIsFollowing(data.is_following);
          } else {
            alert(data.message);
          }
        } catch (error) {
          alert('An error occurred. Please try again.');
        }
      }
    };

    fetchFollowCount();
    fetchFollowStatus();
  }, [publicKey, storyId]);

  const fetchUserData = async () => {
    const endpoint = `${serviceUrl}/users/${publicKey}`;
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      console.log(data);
      if (data) {
        setUserInfo(data);
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    }
  };

  const handleFollow = () => {
    if (!publicKey) {
      openModal();
      return;
    }

    if (userInfo.balance <= 0) {
      setWarning('You do not have enough spice to follow this story.');
      return;
    }

    setIsLoading(true);

    const endpoint = `${serviceUrl}/follow/${storyId}`;
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ public_key: publicKey, follow: !isFollowing }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setIsFollowing(!isFollowing);
          setCount(data.new_count);
          if (data.is_following) {
            fetchUserData();  // Refresh user data to update the spice balance
          }
        } else {
          alert(data.message);
        }
      })
      .catch(() => {
        alert('An error occurred. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <>
      <button
        className={`btn btn-sm ${isFollowing ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={handleFollow}
        disabled={isLoading}
      >
        {isFollowing ? 'Unfollow' : 'Follow'} {icon} <span>{count}</span>
      </button>
      {warning && <p className="warning">{warning}</p>}
    </>
  );
};

export default FollowButton;
