import React, { useState, useEffect } from 'react';
import './PositionPanel.css';

/**
 * Position Panel component for displaying and managing user positions
 * 
 * @param {Object} props Component props
 * @param {Array} props.positions User positions as [{price, shares, type}]
 * @param {number} props.currentPrice Current market price
 * @param {Function} props.onSellPosition Callback for selling a position
 * @param {Object} props.marketWsRef Reference to the market WebSocket
 * @param {Object} props.userWsRef Reference to the user WebSocket
 * @param {string} props.newsId News ID for this market
 * @param {boolean} props.connected WebSocket connection status
 */
const PositionPanel = ({ 
  positions = [], 
  currentPrice = 0,
  onSellPosition,
  successMessage,
  errorMessage,
  marketWsRef,
  userWsRef,
  newsId,
  connected
}) => {
  // State to track auto-disappearing messages
  const [localSuccessMessage, setLocalSuccessMessage] = useState(successMessage);
  const [localErrorMessage, setLocalErrorMessage] = useState(errorMessage);
  
  // Set up effect to make success message disappear after 5 seconds
  useEffect(() => {
    setLocalSuccessMessage(successMessage);
    
    if (successMessage) {
      const timer = setTimeout(() => {
        setLocalSuccessMessage(null);
      }, 5000); // 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  // Set up effect to make error message disappear after 5 seconds
  useEffect(() => {
    setLocalErrorMessage(errorMessage);
    
    if (errorMessage) {
      const timer = setTimeout(() => {
        setLocalErrorMessage(null);
      }, 5000); // 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);
  
  // Set up effect to listen to WebSocket position updates directly
  // This enables the PositionPanel to stay in sync with the TradingPanel's position data
  useEffect(() => {
    if (!connected || !marketWsRef?.current) return;
    
    // Use a message event listener to handle position updates
    const handleWebSocketMessage = (event) => {
      try {
        // Parse the WebSocket message
        let data;
        try {
          if (typeof event.data === 'string') {
            // Check for simple heartbeat responses
            if (event.data === 'pong') return;
            
            // Parse JSON data
            data = JSON.parse(event.data);
          } else {
            // This is likely a binary message - handled by TradingPanel directly
            return;
          }
        } catch (e) {
          // If parsing fails, it might be binary data or invalid format
          return;
        }
        
        // Only process position updates for the current market
        if (data && data.type === 'positions_update' && 
            data.news_id === newsId) {
          console.log('Position WebSocket update received in PositionPanel:', data);
          // The parent component (TradingPanel) will update positions
          // and they will naturally flow down as props
        }
      } catch (e) {
        console.error('Error processing WebSocket message in PositionPanel:', e);
      }
    };
    
    // If the WebSocket is available and open, add our listener
    if (marketWsRef.current && 
        marketWsRef.current.readyState === WebSocket.OPEN) {
      marketWsRef.current.addEventListener('message', handleWebSocketMessage);
    }
    
    // Clean up on unmount
    return () => {
      if (marketWsRef.current) {
        marketWsRef.current.removeEventListener('message', handleWebSocketMessage);
      }
    };
  }, [connected, marketWsRef, newsId]);

  // Calculate total gain/loss (all values are already in cents here)
  const calculateGainLoss = () => {
    if (!positions || positions.length === 0) return 0;
    
    return positions.reduce((total, pos) => {
      if (pos.type === 'long' || pos.type === 'yes') {
        // For YES/long positions, gain is current price - position price
        return total + ((currentPrice - pos.price) * pos.shares);
      } else if (pos.type === 'short' || pos.type === 'no') {
        // For NO/short positions, gain is position price - current price
        return total + ((pos.price - currentPrice) * pos.shares);
      }
      return total;
    }, 0);
  };
  
  // Calculate ROI for a specific position
  const calculateROI = (position) => {
    if (!position) return 0;
    
    let roi = 0;
    if (position.type === 'long' || position.type === 'yes') {
      // For YES/long positions: (current_price - position_price) / position_price * 100
      roi = ((currentPrice - position.price) / position.price) * 100;
    } else if (position.type === 'short' || position.type === 'no') {
      // For NO/short positions: (position_price - current_price) / position_price * 100
      roi = ((position.price - currentPrice) / position.price) * 100;
    }
    
    return roi;
  };
  
  const totalGainLoss = calculateGainLoss();
  const hasNoPositions = positions.some(pos => pos.type === 'short' || pos.type === 'no');
  
  return (
    <div className="personal-stats">
      <h3>Your Positions</h3>
      
      {/* Show messages in position panel with auto-disappear */}
      {localSuccessMessage && (
        <div className="success-message">
          <div className="message-title">
            <span className="message-icon">✅</span>
            Success
          </div>
          <div className="message-content">{localSuccessMessage}</div>
          <div className="timer-bar"></div>
        </div>
      )}
      
      {localErrorMessage && (
        <div className="error-message">
          <div className="message-title">
            <span className="message-icon">❌</span>
            Error
          </div>
          <div className="message-content">{localErrorMessage}</div>
          <div className="timer-bar"></div>
        </div>
      )}
      
      {positions.length === 0 ? (
        <div className="no-positions-panel">
          <div className="no-positions-icon">📊</div>
          <p className="no-positions">Your positions will appear here after you make a trade</p>
          <p className="no-positions-subtitle">Use the buttons above to buy YES or NO shares</p>
        </div>
      ) : (
        <>
          <div className="positions-container">
            {positions.map((pos, i) => {
              const roi = calculateROI(pos);
              const isPositiveROI = roi >= 0;
              
              return (
                <div key={`position-${i}`} className="position-row">
                  <div className="position-info">
                    <div className="position-header">
                      <div className={`position-title ${pos.type}`}>
                        <span className="position-icon">
                          {pos.type === 'long' || pos.type === 'yes' ? '👍' : '👎'}
                        </span>
                        {pos.type === 'long' || pos.type === 'yes' ? 'YES' : 'NO'} • {Math.floor(pos.shares)} shares • {pos.price.toFixed(1)}¢
                      </div>
                      <span className={`position-roi ${isPositiveROI ? 'positive' : 'negative'}`}>
                        {isPositiveROI ? '+' : ''}{roi.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <button className="sell-button position-action-button" onClick={() => onSellPosition(pos)}>
                    Sell
                  </button>
                </div>
              );
            })}
          </div>
          
          {hasNoPositions && (
            <p className="note">
              📊 NO positions profit when belief ratio decreases.
            </p>
          )}
          
          <div className="gain-loss">
            <span className="gain-loss-label">💰 Total Gain/Loss:</span>
            <span className={`gain-loss-value ${totalGainLoss >= 0 ? 'positive' : 'negative'}`}>
              {totalGainLoss >= 0 ? '+' : ''}{totalGainLoss.toFixed(2)}¢
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default PositionPanel;