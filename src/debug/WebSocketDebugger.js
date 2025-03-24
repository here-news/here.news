import React, { useState, useEffect } from 'react';
import { useUser } from '../UserContext';
import './WebSocketDebugger.css';

const WebSocketDebugger = () => {
  const { 
    userSocketConnected, 
    userPositions, 
    forceReconnectWebSocket,
    getWebSocketMetrics 
  } = useUser();
  
  const [metrics, setMetrics] = useState({});
  const [updateCount, setUpdateCount] = useState(0);
  const [showRawPositions, setShowRawPositions] = useState(false);
  const [simulateMode, setSimulateMode] = useState(false);
  
  // Update metrics every second
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getWebSocketMetrics());
      setUpdateCount(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [getWebSocketMetrics]);
  
  // Listen for WebSocket events
  useEffect(() => {
    const handleMessage = () => {
      // Just trigger a metrics update
      setMetrics(getWebSocketMetrics());
    };
    
    window.addEventListener('websocket_message', handleMessage);
    window.addEventListener('websocket_error', handleMessage);
    window.addEventListener('websocket_closed', handleMessage);
    window.addEventListener('websocket_connected', handleMessage);
    
    return () => {
      window.removeEventListener('websocket_message', handleMessage);
      window.removeEventListener('websocket_error', handleMessage);
      window.removeEventListener('websocket_closed', handleMessage);
      window.removeEventListener('websocket_connected', handleMessage);
    };
  }, [getWebSocketMetrics]);
  
  // If API is not available, simulate data for testing
  const simulateWebSocketMessage = () => {
    if (!simulateMode) return;
    
    // Create a fake position update event
    const testNewsId = 'test-news-123';
    const positionUpdateEvent = new CustomEvent('positionUpdate', {
      detail: {
        newsId: testNewsId,
        positions: [
          {
            id: `test-long-${Date.now()}`,
            news_id: testNewsId,
            position_type: 'long',
            shares: 10,
            price: 0.05,
            created_at: new Date().toISOString()
          }
        ]
      }
    });
    
    window.dispatchEvent(positionUpdateEvent);
    
    // Also simulate a WebSocket message event
    window.dispatchEvent(new CustomEvent('websocket_message'));
    
    console.log('Simulated position update event dispatched');
  };
  
  return (
    <div className="websocket-debugger">
      <h2>WebSocket Debugger</h2>
      
      <div className="connection-status">
        <div className={`status-indicator ${userSocketConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-dot"></div>
          <span>{userSocketConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        <button 
          className="reconnect-btn"
          onClick={forceReconnectWebSocket}
        >
          Force Reconnect
        </button>
      </div>
      
      <div className="metrics-section">
        <h3>WebSocket Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-row">
            <span className="metric-label">Total Messages:</span>
            <span className="metric-value">{metrics.totalMessages || 0}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Last Message:</span>
            <span className="metric-value">
              {metrics.lastMessageTime ? new Date(metrics.lastMessageTime).toLocaleTimeString() : 'None'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Socket State:</span>
            <span className="metric-value">
              {metrics.readyState === 0 ? 'Connecting' :
               metrics.readyState === 1 ? 'Open' :
               metrics.readyState === 2 ? 'Closing' :
               metrics.readyState === 3 ? 'Closed' : 'Unknown'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Reconnect Attempts:</span>
            <span className="metric-value">{metrics.reconnectAttempts || 0}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Last Error:</span>
            <span className="metric-value error">{metrics.lastError || 'None'}</span>
          </div>
        </div>
      </div>
      
      <div className="testing-tools">
        <h3>Testing Tools</h3>
        <div className="test-controls">
          <label>
            <input 
              type="checkbox" 
              checked={simulateMode}
              onChange={() => setSimulateMode(!simulateMode)}
            />
            Simulation Mode
          </label>
          
          <button 
            className="test-btn"
            onClick={simulateWebSocketMessage}
            disabled={!simulateMode}
          >
            Simulate Message
          </button>
        </div>
      </div>
      
      <div className="positions-section">
        <div className="positions-header">
          <h3>User Positions</h3>
          <button 
            className="toggle-btn"
            onClick={() => setShowRawPositions(!showRawPositions)}
          >
            {showRawPositions ? 'Show Summary' : 'Show Raw Data'}
          </button>
        </div>
        
        {showRawPositions ? (
          <pre className="positions-raw">
            {JSON.stringify(userPositions, null, 2)}
          </pre>
        ) : (
          <div className="positions-summary">
            <table>
              <thead>
                <tr>
                  <th>News ID</th>
                  <th>Type</th>
                  <th>Shares</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(userPositions).flatMap(([newsId, positions]) => 
                  Array.isArray(positions) ? positions.map((position, idx) => (
                    <tr key={`${newsId}-${idx}`}>
                      <td>{newsId.substring(0, 10)}...</td>
                      <td>{position.position_type || position.type || 'unknown'}</td>
                      <td>{position.shares}</td>
                    </tr>
                  )) : (
                    <tr key={newsId}>
                      <td>{newsId.substring(0, 10)}...</td>
                      <td>unknown format</td>
                      <td>N/A</td>
                    </tr>
                  )
                )}
                {Object.keys(userPositions).length === 0 && (
                  <tr>
                    <td colSpan="3">No positions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="update-info">
        Last updated: {new Date().toLocaleTimeString()} (#{updateCount})
      </div>
    </div>
  );
};

export default WebSocketDebugger;