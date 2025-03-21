import React from 'react';
import './PriceBar.css';

/**
 * Price Bar component for visualizing market price and positions
 * 
 * @param {Object} props Component props
 * @param {number} props.currentPrice Current market price
 * @param {number} props.previousPrice Previous market price
 * @param {number} props.maxPrice Maximum price scale (default: 10)
 * @param {Array} props.positions User position data as [{price, shares, type}]
 * @param {Array} props.issuanceTiers Issuance tier data as [{price}]
 */
const PriceBar = ({ 
  currentPrice = 0, 
  previousPrice = 0,
  maxPrice = 10, 
  positions = [], 
  issuanceTiers = [
    { price: 6, description: "Next Issuance Tier @ 6¢" },
    { price: 7, description: "Issuance Tier @ 7¢" }
  ] 
}) => {
  // Calculate price percentage for positioning
  const pricePercent = (currentPrice / maxPrice) * 100;
  
  // Calculate price change
  const priceChange = currentPrice - previousPrice;
  const priceChangeClass = priceChange >= 0 ? "price-up" : "price-down";
  
  return (
    <div className="price-bar-container">
      <div className="legend">
        <span>0¢</span>
        <span>5¢</span>
        <span>10¢</span>
      </div>
      
      <div className="market-bar">
        {/* Current price indicator */}
        <div 
          className="price-indicator" 
          style={{ left: `${pricePercent}%` }}
          title={`Market Price: ${currentPrice.toFixed(1)}¢`}
        />
        
        {/* Issuance tier markers */}
        {issuanceTiers.map((tier, i) => (
          <div 
            key={`tier-${i}`}
            className="issuance-marker" 
            style={{ left: `${(tier.price / maxPrice) * 100}%` }}
            title={tier.description || `Issuance Tier @ ${tier.price}¢`}
          />
        ))}
        
        {/* User position markers */}
        {positions.map((pos, i) => (
          <div 
            key={`pos-${i}`}
            className={pos.type === 'short' ? 'short-marker' : 'stake-marker'} 
            style={{ left: `${(pos.price / maxPrice) * 100}%` }}
            title={`Your ${pos.type === 'short' ? 'Short' : 'Stake'}: ${pos.price}¢ (${pos.shares} shares)`}
          />
        ))}
      </div>
      
      <div className="issuance-note">
        🔷 Issuance increases as price crosses 6¢, 7¢, ... tiers (doubling shares per tier)
      </div>
      
      <div className="stats">
        <p>
          📈 Current Market Price: <strong>{currentPrice.toFixed(1)}¢</strong> 
          <span className={priceChangeClass}>
            ({priceChange >= 0 ? "+" : ""}{priceChange.toFixed(1)}¢)
          </span>
        </p>
      </div>
    </div>
  );
};

export default PriceBar;