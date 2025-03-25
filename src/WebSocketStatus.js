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
      }, 6000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [tooltipVisible]);

  // Track WebSocket events to update indicator
  useEffect(() => {
    let timeout;
    let consecutiveDisconnects = 0;
    let isConnected = userSocketConnected;
    let lastEventTime = Date.now();
    
    const handleWsEvent = (event) => {
      if (Date.now() - lastEventTime < 300) return;
      lastEventTime = Date.now();
      
      if (timeout) clearTimeout(timeout);
      
      if (event.type === 'websocket_closed' || event.type === 'websocket_error') {
        consecutiveDisconnects++;
      } else if (event.type === 'websocket_connected') {
        consecutiveDisconnects = 0;
      }
      
      const shouldProcessDisconnect = 
        (event.type === 'websocket_closed' || event.type === 'websocket_error') &&
        (consecutiveDisconnects >= 2);
      
      timeout = setTimeout(() => {
        if (event.type === 'websocket_connected' && !isConnected) {
          isConnected = true;
          setTooltipVisible(false);
        } else if (shouldProcessDisconnect && isConnected) {
          isConnected = false;
          setTooltipVisible(false);
        }
      }, event.type === 'websocket_connected' ? 800 : 3000);
    };
    
    window.addEventListener('websocket_connected', handleWsEvent);
    window.addEventListener('websocket_closed', handleWsEvent);
    window.addEventListener('websocket_error', handleWsEvent);
    
    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener('websocket_connected', handleWsEvent);
      window.removeEventListener('websocket_closed', handleWsEvent);
      window.removeEventListener('websocket_error', handleWsEvent);
    };
  }, [userSocketConnected]);

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