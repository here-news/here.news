import React from 'react';
import './MarketActions.css';

/**
 * Simple MarketActions component with static buttons
 * to prevent flickering during frequent renders
 */
class MarketActions extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      amount: 1
    };
  }
  
  handleBuyClick = () => {
    this.props.onExecuteTrade('buy', this.state.amount);
  };
  
  handleShortClick = () => {
    this.props.onExecuteTrade('short', this.state.amount);
  };
  
  renderSentiment = () => {
    const { marketStats } = this.props;
    const sentiment = marketStats?.stats?.sentiment || null;
    
    if (!sentiment || (sentiment.long === undefined && sentiment.short === undefined)) {
      return null;
    }
    
    // Normalize values to ensure they add up to 100%
    let longPercent = sentiment.long !== undefined ? sentiment.long : 50;
    let shortPercent = sentiment.short !== undefined ? sentiment.short : 50;
    
    // Ensure the values add up to 100
    const total = longPercent + shortPercent;
    if (total !== 100) {
      longPercent = Math.round((longPercent / total) * 100);
      shortPercent = 100 - longPercent; // Ensure perfect 100%
    }
    
    return (
      <div className="sentiment-bar-container">
        <div className="sentiment-label">
          Market Sentiment
        </div>
        <div className="sentiment-bar">
          <div 
            className="sentiment-long" 
            style={{ width: `${longPercent}%` }}
            title={`${longPercent}% Support`}
          >
            {longPercent >= 20 ? `${longPercent}%` : ''}
          </div>
          <div 
            className="sentiment-short" 
            style={{ width: `${shortPercent}%` }}
            title={`${shortPercent}% Oppose`}
          >
            {shortPercent >= 20 ? `${shortPercent}%` : ''}
          </div>
        </div>
      </div>
    );
  };
  
  render() {
    const { marketStats, loading } = this.props;
    
    // Safe access to properties
    const volume = marketStats?.volume || 0;
    const userCount = marketStats?.user_count || 0;
    const marketCap = marketStats?.market_cap || 0;
    const totalShares = marketStats?.total_shares || 0;
    
    return (
      <div className="market-actions">
        <div className="stats-container">
          <p>🧮 Total Market Volume: ${volume.toFixed(2)} from {userCount} users</p>
          <p>💫 Market Cap: ${marketCap.toFixed(2)}</p>
          <p>
            🔢 Total Shares: {totalShares} 
            <span 
              className="info-tooltip" 
              title="Issuance increases as price crosses 6¢, 7¢, ... tiers (doubling shares per tier)"
            >
              ❓
            </span>
          </p>
          {this.renderSentiment()}
        </div>
        
        <div className="action-buttons">
          <button 
            onClick={this.handleBuyClick}
            disabled={loading}
            className="market-buy-button"
          >
            💚 Buy Long
          </button>
          <button 
            onClick={this.handleShortClick}
            disabled={loading}
            className="market-short-button"
          >
            💔 Short
          </button>
        </div>
      </div>
    );
  }
}

export default MarketActions;