import React, { useEffect, useRef } from 'react';
import { useUser } from './UserContext';
import './PriceBar.css';

/**
 * Modern PriceBar Component that shows a price indicator and market data
 * 
 * @param {Object} props Component props
 * @param {number} props.currentPrice Current market price in cents (e.g. 5.2 for 5.2¢)
 * @param {number} props.previousPrice Previous market price in cents for comparison
 * @param {Array} props.positions User positions with price in cents (e.g. [{price: 4.5, shares: 10, type: 'long'}])
 * @param {Array} props.issuanceTiers Price thresholds where new shares are issued
 */
const PriceBar = ({ 
  currentPrice = 5, 
  previousPrice = 5,
  positions = [],
  issuanceTiers = [],
  connected = false
}) => {
  const { userSocketConnected } = useUser();
  // Use a ref to keep track of the chart container for sizing
  const chartRef = useRef(null);
  
  // Chart generation will go here for MiniPriceChart integration
  useEffect(() => {
    if (chartRef.current) {
      // In the future, this is where we would initialize or update a chart library
      // For now, we'll just use a placeholder
    }
  }, [currentPrice]);
  
  // For pricing, we consider a range from 0 to 15 cents
  const minPrice = 0;
  const maxPrice = 15;
  
  // Calculate the percentage position for the current price
  const pricePosition = Math.min(Math.max((currentPrice - minPrice) / (maxPrice - minPrice) * 100, 0), 100);
  
  // Determine price change direction and formatting
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice ? (priceChange / previousPrice) * 100 : 0;
  const isPriceUp = priceChange >= 0;
  
  // Calculate change indicator width based on the price difference
  const changeWidth = Math.min(Math.abs(priceChange) / (maxPrice - minPrice) * 100, pricePosition);
  const changeStartPosition = isPriceUp ? pricePosition - changeWidth : pricePosition;
  
  // Create legend markers at 0, 5, 10, 15 cents
  const legendPositions = [0, 5, 10, 15];
  
  return (
    <div className="price-bar-container">
      {/* Current price header with price change */}
      <div className="price-header">
        <div className="current-price-container">
          <span className="current-price">
            {currentPrice.toFixed(1)}¢
            {/* Small connection indicator dot */}
            <span className={`connection-dot ${connected || userSocketConnected ? 'connected pulse-fast' : 'disconnected pulse-slow'}`} 
                  title={connected || userSocketConnected ? 'Real-time data' : 'Auto-refresh data'}>
            </span>
          </span>
          <div className={`price-change ${isPriceUp ? 'price-up' : 'price-down'}`}>
            <span className="price-icon">{isPriceUp ? '▲' : '▼'}</span>
            <span>{Math.abs(priceChange).toFixed(1)}¢ ({Math.abs(priceChangePercent).toFixed(1)}%)</span>
          </div>
        </div>
        
        {/* Market Sentiment */}
        <div className="sentiment-container">
          <div className="sentiment-label">Market Sentiment</div>
          <div className="sentiment-bar">
            <div className="sentiment-long" style={{ width: '65%' }}></div>
            <div className="sentiment-short" style={{ width: '35%' }}></div>
          </div>
        </div>
      </div>
      
      {/* Mini Chart (Placeholder) */}
      <div className="chart-container" ref={chartRef}>
        <div className="mini-chart"></div>
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
      
      {/* Position markers */}
      {positions && positions.length > 0 && (
        <div className="position-markers">
          {positions.map((position, index) => {
            const markerPosition = ((position.price - minPrice) / (maxPrice - minPrice)) * 100;
            const roi = currentPrice - position.price;
            const roiPercent = position.price ? (roi / position.price) * 100 : 0;
            
            // For short positions, the ROI is inverted
            const adjustedRoi = position.type === 'short' ? -roi : roi;
            const adjustedRoiPercent = position.type === 'short' ? -roiPercent : roiPercent;
            const isPositive = adjustedRoi >= 0;
            
            return (
              <div 
                key={`position-${index}`} 
                className={`position-marker ${position.type}`}
                style={{ left: `${markerPosition}%` }}
              >
                {position.type === 'long' ? '▲' : '▼'}
                <div className="tooltip">
                  {position.type === 'long' ? 'Long' : 'Short'} @ {position.price.toFixed(1)}¢
                  <br />
                  {position.shares} shares
                  <br />
                  ROI: <span className={isPositive ? 'positive' : 'negative'}>
                    {isPositive ? '+' : ''}{adjustedRoiPercent.toFixed(1)}%
                  </span>
                </div>
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