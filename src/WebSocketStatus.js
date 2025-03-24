import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import './WebSocketStatus.css';

const WebSocketStatus = () => {
  const { userSocketConnected, forceReconnectWebSocket } = useUser();
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Toggle tooltip
  const toggleTooltip = () => {
    setTooltipVisible(!tooltipVisible);
  };

  useEffect(() => {
    // Auto-hide tooltip after 3 seconds
    let timer;
    if (tooltipVisible) {
      timer = setTimeout(() => {
        setTooltipVisible(false);
      }, 3000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [tooltipVisible]);

  // Track WebSocket events to update indicator
  useEffect(() => {
    const handleWsEvent = () => {
      // Force component re-render
      setTooltipVisible(false);
    };
    
    window.addEventListener('websocket_connected', handleWsEvent);
    window.addEventListener('websocket_closed', handleWsEvent);
    window.addEventListener('websocket_error', handleWsEvent);
    
    return () => {
      window.removeEventListener('websocket_connected', handleWsEvent);
      window.removeEventListener('websocket_closed', handleWsEvent);
      window.removeEventListener('websocket_error', handleWsEvent);
    };
  }, []);

  // Show a dot indicator that is green when connected, red when disconnected
  return (
    <div className="ws-status-container">
      <div 
        className={`ws-indicator ${userSocketConnected ? 'ws-connected' : 'ws-disconnected'}`}
        onClick={toggleTooltip}
      >
        <div className="ws-dot"></div>
      </div>
      
      {tooltipVisible && (
        <div className="ws-tooltip">
          <p>{userSocketConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}</p>
          {!userSocketConnected && (
            <button 
              className="ws-retry-button"
              onClick={() => {
                forceReconnectWebSocket();
                setTooltipVisible(false);
              }}
            >
              Reconnect
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default WebSocketStatus;