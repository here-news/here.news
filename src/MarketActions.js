import React, { useState } from 'react';
import './MarketActions.css';

/**
 * Enhanced MarketActions component with modern styling and improved UX
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
  
  handleAmountChange = (event) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value > 0) {
      this.setState({ amount: value });
    }
  };
  
  incrementAmount = () => {
    this.setState(prevState => ({ amount: prevState.amount + 1 }));
  };
  
  decrementAmount = () => {
    if (this.state.amount > 1) {
      this.setState(prevState => ({ amount: prevState.amount - 1 }));
    }
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
          <span className="stat-icon">🌡️</span> Market Sentiment
        </div>
        <div className="sentiment-bar">
          <div 
            className="sentiment-long" 
            style={{ width: `${longPercent}%` }}
          ></div>
          <div 
            className="sentiment-short" 
            style={{ width: `${shortPercent}%` }}
          ></div>
        </div>
        <div className="sentiment-text">
          <span className="long">{longPercent}% Support</span>
          <span className="short">{shortPercent}% Oppose</span>
        </div>
      </div>
    );
  };
  
  render() {
    const { marketStats, loading } = this.props;
    const { amount } = this.state;
    
    // Safe access to properties
    const volume = marketStats?.volume || 0;
    const userCount = marketStats?.user_count || 0;
    const marketCap = marketStats?.market_cap || 0;
    const totalShares = marketStats?.total_shares || 0;
    
    return (
      <div className="market-actions">
        <h3>Market Trading Actions</h3>
        
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-title">
              <span className="stat-icon">📊</span> Market Cap
            </div>
            <div className="stat-value">${marketCap.toFixed(2)}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-title">
              <span className="stat-icon">📈</span> Volume
            </div>
            <div className="stat-value">${volume.toFixed(2)}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-title">
              <span className="stat-icon">👥</span> Traders
            </div>
            <div className="stat-value">{userCount}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-title">
              <span className="stat-icon">🔢</span> Shares
              <span className="info-tooltip" data-tooltip="Issuance increases as price crosses tiers (doubling shares per tier)">ⓘ</span>
            </div>
            <div className="stat-value">{totalShares.toLocaleString()}</div>
          </div>
        </div>
        
        {this.renderSentiment()}
        
        <div className="quantity-selector">
          <div className="quantity-label">Trade Quantity</div>
          <div className="quantity-controls">
            <button 
              className="quantity-button" 
              onClick={this.decrementAmount}
              disabled={amount <= 1}
            >–</button>
            <input
              type="number"
              className="quantity-input"
              value={amount}
              onChange={this.handleAmountChange}
              min="1"
            />
            <button 
              className="quantity-button" 
              onClick={this.incrementAmount}
            >+</button>
          </div>
        </div>
        
        <div className="action-buttons">
          <button 
            onClick={this.handleBuyClick}
            disabled={loading}
            className="market-buy-button"
          >
            ▲ Buy Long ({amount} shares)
          </button>
          <button 
            onClick={this.handleShortClick}
            disabled={loading}
            className="market-short-button"
          >
            ▼ Sell Short ({amount} shares)
          </button>
        </div>
      </div>
    );
  }
}

export default MarketActions;