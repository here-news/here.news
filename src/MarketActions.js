import React, { useState } from 'react';
import './MarketActions.css';

/**
 * Market Actions component for trading operations
 * 
 * @param {Object} props Component props
 * @param {Object} props.marketStats Market statistics
 * @param {Function} props.onExecuteTrade Callback for executing a trade
 * @param {boolean} props.loading Loading state
 */
const MarketActions = ({ 
  marketStats, 
  onExecuteTrade,
  loading = false 
}) => {
  const [amount, setAmount] = useState(1);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState('buy');
  
  const handleTradeClick = (action) => {
    setSelectedAction(action);
    setTradeModalOpen(true);
  };
  
  const handleSubmitTrade = () => {
    onExecuteTrade(selectedAction, amount);
    setTradeModalOpen(false);
  };
  
  const closeModal = () => {
    setTradeModalOpen(false);
  };
  
  return (
    <div className="market-actions">
      <div className="stats-container">
        <p>🧮 Total Market Volume: ${marketStats?.volume?.toFixed(2) || '0.00'} from {marketStats?.user_count || '0'} users</p>
      </div>
      
      <div className="action-buttons">
        <button 
          onClick={() => handleTradeClick('buy')}
          disabled={loading}
          className="buy-button"
        >
          💚 Buy Long
        </button>
        <button 
          onClick={() => handleTradeClick('short')}
          disabled={loading}
          className="short-button"
        >
          💔 Short
        </button>
      </div>
      
      {/* Trade Modal */}
      {tradeModalOpen && (
        <div className="trade-modal">
          <div className="modal-content">
            <h3>{selectedAction === 'buy' ? 'Buy Long Position' : 'Short Position'}</h3>
            <p>Current Price: ${(marketStats?.current_price || 0).toFixed(2)} (${((marketStats?.current_price || 0) * 100).toFixed(1)}¢)</p>
            
            <div className="form-group">
              <label>Amount (shares):</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            
            <div className="form-summary">
              <p>Total Cost: ${((marketStats?.current_price || 0) * amount).toFixed(2)} (${((marketStats?.current_price || 0) * 100 * amount).toFixed(1)}¢)</p>
            </div>
            
            <div className="modal-actions">
              <button onClick={closeModal} className="cancel-button">Cancel</button>
              <button 
                onClick={handleSubmitTrade} 
                className={selectedAction === 'buy' ? 'confirm-buy' : 'confirm-short'}
                disabled={loading}
              >
                {loading ? 'Processing...' : (selectedAction === 'buy' ? 'Confirm Buy' : 'Confirm Short')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketActions;