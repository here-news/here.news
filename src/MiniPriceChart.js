import React from 'react';
import './NewsColossal.css';

const MiniPriceChart = ({ priceHistory, percentChange, width = 40, height = 20 }) => {
  // If no price history is provided, generate mock data based on percent change
  const generateChart = () => {
    const mockPrices = [];
    const numPoints = 10;
    const parsedChange = parseFloat(percentChange || 0);
    const direction = parsedChange >= 0 ? 1 : -1;
    const volatility = Math.abs(parsedChange) / 10;
    
    for (let i = 0; i < numPoints; i++) {
      // Generate a price following the trend but with some randomness
      const progress = i / (numPoints - 1);
      const randomness = (Math.random() - 0.5) * volatility;
      const pointValue = 100 + (direction * progress * Math.abs(parsedChange)) + randomness;
      mockPrices.push(pointValue);
    }
    
    return mockPrices;
  };
  
  // Use provided price history or generate mock data
  const prices = priceHistory || generateChart();
  
  // Determine min and max for scaling
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  
  // Determine color based on percent change
  const parseChange = parseFloat(percentChange || 0);
  const chartColor = parseChange >= 0 ? '#00C853' : '#FF5252';
  
  // Generate SVG path
  const generatePath = () => {
    if (!prices || prices.length === 0) return '';
    
    // Map prices to coordinates
    return prices.map((price, index) => {
      const x = (index / (prices.length - 1)) * width;
      const normalizedPrice = priceRange === 0 
        ? height / 2 
        : ((price - minPrice) / priceRange);
      const y = height - (normalizedPrice * height);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };
  
  return (
    <div className="mini-price-chart" style={{ width: `${width}px`, height: `${height}px` }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path 
          d={generatePath()}
          stroke={chartColor}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span 
        className="percent-change" 
        style={{ color: parseChange >= 0 ? '#00C853' : '#FF5252' }}
      >
        {parseChange >= 0 ? '+' : ''}{parseChange?.toFixed(1) || '0.0'}%
      </span>
    </div>
  );
};

export default MiniPriceChart;