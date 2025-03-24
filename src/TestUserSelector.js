import React, { useState } from 'react';
import { useUser } from './UserContext';
import serviceUrl from './config';
import './TestUserSelector.css';

const TestUserSelector = () => {
  const { setPublicKey, openModal } = useUser();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Known test users with public keys
  const testUsers = [
    { name: "Alice", publicKey: "d6aa72f57b05e3916cd8e8d0943270c58a1519733fc6bef0b79e1b6ff45ca4c6" },
    { name: "Bob", publicKey: "a505f8f5a5f927b9c9ac0c0197a0b20a879cd080f16b994cd486d9cb85e15f24" },
    { name: "Charlie", publicKey: "28d2e1b42ee6baab54b522e1bfbb9e63d94bfc77f6f20e6cd37dff941aea1a91" },
    { name: "Diana", publicKey: "4c834153b2a0c59e6a3fa0d28b298bdeb1b2e4bb5d4e3c2a44bbb2c0e90514f4" }
  ];

  const selectUser = async (user) => {
    setStatus('loading');
    setMessage(`Authenticating as ${user.name}...`);

    try {
      // Check if we can authenticate with this user
      const response = await fetch(`${serviceUrl}/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': user.publicKey
        }
      });

      if (response.ok) {
        // Authentication successful
        let userData;
        try {
          userData = await response.json();
        } catch (e) {
          console.log('Failed to parse user data as JSON');
          userData = { name: user.name };
        }

        // Store public key in localStorage
        localStorage.setItem('publicKey', user.publicKey);
        
        // Update the context
        setPublicKey(user.publicKey);
        
        setStatus('success');
        setMessage(`Logged in as ${userData.name || user.name}. Balance: $${userData.balance?.toFixed(2) || '0.00'}`);
        
        // Hide message after a delay
        setTimeout(() => {
          setStatus('');
          setMessage('');
          setIsExpanded(false);
        }, 2000);
        
        // Force a page reload after a delay to ensure all components update
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        // Authentication failed
        setStatus('error');
        setMessage(`Authentication failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error during authentication:', error);
      setStatus('error');
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="test-user-selector">
      {!isExpanded ? (
        <button 
          className="test-user-toggle"
          onClick={() => setIsExpanded(true)}
        >
          🧪 Test Users
        </button>
      ) : (
        <div className="test-user-panel">
          <div className="test-user-header">
            <h4>Test User Authentication</h4>
            <button 
              className="test-user-close" 
              onClick={() => setIsExpanded(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="test-user-list">
            {testUsers.map(user => (
              <button
                key={user.publicKey}
                className="test-user-button"
                onClick={() => selectUser(user)}
                disabled={status === 'loading'}
              >
                {user.name}
              </button>
            ))}
          </div>
          
          {message && (
            <div className={`test-user-message ${status}`}>
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestUserSelector;