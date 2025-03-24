import React, { useState } from 'react';
import serviceUrl from '../config';

const AuthDebugger = () => {
  const [debugOutput, setDebugOutput] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const hardcodedUsers = [
    { name: "Alice", public_key: "d6aa72f57b05e3916cd8e8d0943270c58a1519733fc6bef0b79e1b6ff45ca4c6" },
    { name: "Bob", public_key: "b8c6785a3f4ffb1e5621de6e60dbce15c52a8dc9bfc5ff0b69a383102ef96ddd" },
    { name: "Charlie", public_key: "28d2e1b42ee6baab54b522e1bfbb9e63d94bfc77f6f20e6cd37dff941aea1a91" },
    { name: "Diana", public_key: "4c834153b2a0c59e6a3fa0d28b298bdeb1b2e4bb5d4e3c2a44bbb2c0e90514f4" }
  ];

  const checkAuth = async (key) => {
    setLoading(true);
    setDebugOutput(`Testing authentication with key: ${key}`);
    
    try {
      // Test direct auth with /me endpoint
      const response = await fetch(`${serviceUrl}/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': key
        }
      });
      
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { _raw: responseText };
      }
      
      setDebugOutput(prev => `${prev}\n\nResponse status: ${response.status} ${response.statusText}\nResponse headers: ${JSON.stringify(Object.fromEntries([...response.headers.entries()]))}\nResponse data: ${JSON.stringify(responseData, null, 2)}`);
      
      // Try using document.cookie to see stored cookies
      setDebugOutput(prev => `${prev}\n\nCookies: ${document.cookie || "No cookies found"}`);
      
      // Check localStorage
      setDebugOutput(prev => `${prev}\n\nLocalStorage publicKey: ${localStorage.getItem('publicKey') || "Not found"}`);
      
    } catch (error) {
      setDebugOutput(prev => `${prev}\n\nError: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const directAuthAndFund = async (user) => {
    setLoading(true);
    setDebugOutput(`Selecting ${user.name} (${user.public_key.substring(0, 8)}...)`);
    
    try {
      // 1. First verify auth works
      const authResponse = await fetch(`${serviceUrl}/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': user.public_key
        }
      });
      
      if (!authResponse.ok) {
        setDebugOutput(`Authentication failed for ${user.name}: ${authResponse.status} ${authResponse.statusText}`);
        setLoading(false);
        return;
      }
      
      const userData = await authResponse.json();
      
      // 2. Update context and localStorage directly with this user
      try {
        localStorage.setItem('publicKey', user.public_key);
        
        // This is critical - we need to replace the global window object since some components
        // might be using it directly instead of context
        window.localStorage.setItem('publicKey', user.public_key);
        
        setDebugOutput(`Selected ${userData.name}, balance: $${userData.balance || 0}. Refreshing page...`);
        
        // Add a slight delay before reloading
        setTimeout(() => {
          // Force full page refresh to ensure everything is reset properly
          window.location.href = window.location.href.split('?')[0] + '?forcereload=' + Date.now();
        }, 500);
      } catch (storageError) {
        console.error('Error updating localStorage:', storageError);
        setDebugOutput(`Error updating user: ${storageError.message}`);
      }
    } catch (error) {
      setDebugOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isExpanded) {
    return (
      <div style={{ 
        padding: '10px', 
        textAlign: 'center',
        marginBottom: '15px'
      }}>
        <button
          onClick={() => setIsExpanded(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Select Test User
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '15px', 
      border: '1px solid #007bff', 
      borderRadius: '8px', 
      margin: '15px 0',
      backgroundColor: '#f0f8ff',
      position: 'relative'
    }}>
      <button
        onClick={() => setIsExpanded(false)}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          padding: '2px 8px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Close
      </button>
      
      <h4 style={{ color: '#007bff', marginTop: 0 }}>Select Test User</h4>
      
      <div>
        <h5 style={{ marginBottom: '8px', fontSize: '14px' }}>Choose a test user:</h5>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
          {hardcodedUsers.map(user => (
            <button
              key={user.public_key}
              onClick={() => directAuthAndFund(user)}
              disabled={loading}
              style={{
                padding: '8px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Select {user.name}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ 
        maxHeight: '100px', 
        overflowY: 'auto', 
        marginTop: '10px',
        border: '1px solid #ddd',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        fontFamily: 'monospace',
        fontSize: '12px',
        whiteSpace: 'pre-wrap'
      }}>
        {debugOutput || 'Select a user to authenticate'}
      </div>
    </div>
  );
};

export default AuthDebugger;