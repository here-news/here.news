import React, { useEffect, useRef } from 'react';
import { useUser } from './UserContext';
import './PriceBar.css';

/**
 * Modern PriceBar Component that shows a price indicator and market data
 * 
 * @param {Object} props Component props
 * @param {number} props.price Current market price in cents (e.g. 5.2 for 5.2¢)
 * @param {number} props.volume Trading volume amount
 * @param {string} props.percentChange Percentage change as string (e.g. "5.2")
 * @param {number} props.userCount Number of traders
 * @param {Array} props.issuanceTiers Price thresholds where new shares are issued
 */
const PriceBar = ({ 
  price = 5, 
  volume = 0,
  percentChange = "0.0",
  userCount = 0,
  issuanceTiers = []
}) => {
  const { userSocketConnected } = useUser();
  // Use a ref to keep track of the chart container for sizing
  const chartRef = useRef(null);
  
  // For pricing, we consider a range from 0 to 15 cents
  const minPrice = 0;
  const maxPrice = 15;
  
  // Calculate the percentage position for the current price
  const pricePosition = Math.min(Math.max((price - minPrice) / (maxPrice - minPrice) * 100, 0), 100);
  
  // Determine price change direction and formatting
  const parsedChange = parseFloat(percentChange);
  const isPriceUp = parsedChange >= 0;
  
  // Calculate change indicator width based on relative percentage change (for visualization)
  const changeWidth = Math.min(Math.abs(parsedChange / 10), 25); // Cap at 25% of the bar width
  const changeStartPosition = isPriceUp ? pricePosition - changeWidth : pricePosition;
  
  // Create legend markers at 0, 5, 10, 15 cents
  const legendPositions = [0, 5, 10, 15];
  
  return (
    <div className="price-bar-container">
      {/* Current price header with price change */}
      <div className="price-header">
        <div className="current-price-container">
          <span className="current-price">
            {price.toFixed(1)}¢
            {/* Small connection indicator dot */}
            <span className={`connection-dot ${userSocketConnected ? 'connected pulse-fast' : 'disconnected pulse-slow'}`} 
                  title={userSocketConnected ? 'Real-time data' : 'Auto-refresh data'}>
            </span>
          </span>
          <div className={`price-change ${isPriceUp ? 'price-up' : 'price-down'}`}>
            <span className="price-icon">{isPriceUp ? '▲' : '▼'}</span>
            <span>{isPriceUp ? '+' : ''}{percentChange}%</span>
          </div>
        </div>
        
        {/* Volume & traders */}
        <div className="market-metrics">
          <div className="metric">
            <span className="metric-label">Volume:</span>
            <span className="metric-value">${volume.toFixed(2)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Traders:</span>
            <span className="metric-value">{userCount}</span>
          </div>
        </div>
      </div>
      
      {/* Price Range Bar */}
      <div className="legend">
        {legendPositions.map(pos => (
          <span key={pos}>{pos}¢</span>
        ))}
      </div>
      
      <div className="market-bar">
        {/* Price change indicator (red or green bar) */}
        {isPriceUp ? (
          <div className="price-change-up" style={{ 
            left: `${changeStartPosition}%`, 
            width: `${changeWidth}%` 
          }}></div>
        ) : (
          <div className="price-change-down" style={{ 
            left: `${changeStartPosition}%`, 
            width: `${changeWidth}%` 
          }}></div>
        )}
        
        {/* Current price indicator (vertical line) */}
        <div className="price-indicator" style={{ left: `${pricePosition}%` }}></div>
      </div>
      
      {/* Legend dots with highlight on current position */}
      <div className="legend-dots" style={{ width: '100%' }}>
        {legendPositions.map(pos => {
          const dotPosition = ((pos - minPrice) / (maxPrice - minPrice)) * 100;
          return (
            <div key={`dot-${pos}`} className="legend-dot" style={{ left: `${dotPosition}%` }}></div>
          );
        })}
        
        <div className="legend-highlight" style={{ left: `${pricePosition}%` }}></div>
      </div>
      
      {/* Issuance tier markers */}
      {issuanceTiers && issuanceTiers.length > 0 && (
        <div className="issuance-markers">
          {issuanceTiers.map((tier, index) => {
            const markerPosition = ((tier.price - minPrice) / (maxPrice - minPrice)) * 100;
            return (
              <div 
                key={`tier-${index}`} 
                className="issuance-marker" 
                style={{ left: `${markerPosition}%` }}
              >
                <div className="tooltip">{tier.description}</div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Issuance note if applicable */}
      {issuanceTiers && issuanceTiers.length > 0 && (
        <div className="issuance-note">
          Next issuance tier at {issuanceTiers[0].price}¢ will double available shares
        </div>
      )}
    </div>
  );
};

export default PriceBar;