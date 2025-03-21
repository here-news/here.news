import React, { useState, useEffect } from 'react';
import './PositionPanel.css';

/**
 * Position Panel component for displaying and managing user positions
 * 
 * @param {Object} props Component props
 * @param {Array} props.positions User positions as [{price, shares, type}]
 * @param {number} props.currentPrice Current market price
 * @param {Function} props.onSellPosition Callback for selling a position
 */
const PositionPanel = ({ 
  positions = [], 
  currentPrice = 0,
  onSellPosition,
  successMessage,
  errorMessage
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
  // Calculate total gain/loss (all values are already in cents here)
  const calculateGainLoss = () => {
    if (!positions || positions.length === 0) return 0;
    
    return positions.reduce((total, pos) => {
      if (pos.type === 'long') {
        // For long positions, gain is current price - position price
        return total + ((currentPrice - pos.price) * pos.shares);
      } else if (pos.type === 'short') {
        // For short positions, gain is position price - current price
        return total + ((pos.price - currentPrice) * pos.shares);
      }
      return total;
    }, 0);
  };
  
  const totalGainLoss = calculateGainLoss();
  const hasShorts = positions.some(pos => pos.type === 'short');
  
  return (
    <div className="personal-stats">
      <h3>Your Positions</h3>
      
      {/* Show messages in position panel with auto-disappear */}
      {localSuccessMessage && <div className="success-message">{localSuccessMessage}</div>}
      {localErrorMessage && <div className="error-message">{localErrorMessage}</div>}
      
      {positions.length === 0 ? (
        <p className="no-positions">You don't have any positions yet. Buy or short to get started!</p>
      ) : (
        <>
          {positions.map((pos, i) => (
            <p key={`position-${i}`} className="position-row">
              {pos.type === 'long' ? '🧍‍♂️ Your Stake Position: ' : '📉 Your Short Position: '}
              <span className="position-details">
                {pos.price.toFixed(1)}¢ ({pos.shares} shares)
              </span>
              
              {pos.type === 'long' ? (
                <button 
                  className="sell-button" 
                  onClick={() => onSellPosition(pos)}
                >
                  Sell
                </button>
              ) : (
                <button
                  className="close-button"
                  onClick={() => onSellPosition(pos)}
                >
                  Close
                </button>
              )}
            </p>
          ))}
          
          {hasShorts && (
            <p className="note">
              🔁 Shorts will be liquidated if price rises 1.5¢ above short entry.
            </p>
          )}
          
          <p className="gain-loss">
            💰 Current Personal Gain/Loss: 
            <strong className={totalGainLoss >= 0 ? 'positive' : 'negative'}>
              {totalGainLoss >= 0 ? ' +' : ' '}{totalGainLoss.toFixed(2)}¢
            </strong>
          </p>
        </>
      )}
    </div>
  );
};

export default PositionPanel;