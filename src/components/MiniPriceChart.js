import React from 'react';

// Mini price chart component to show price history
const MiniPriceChart = ({ priceHistory, percentChange, width = 40, height = 20 }) => {
  // Default empty array if no price history provided
  const data = priceHistory || [];
  
  if (!data || data.length === 0) return null;
  
  const minPrice = Math.min(...data);
  const maxPrice = Math.max(...data);
  const range = maxPrice - minPrice;
  const chartColor = parseFloat(percentChange) >= 0 ? '#28a745' : '#dc3545';
  
  const points = data.map((price, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((price - minPrice) / (range || 1)) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div className="mini-chart-container">
      <svg width={width} height={height} className="mini-price-chart">
        <polyline
          points={points}
          fill="none"
          stroke={chartColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span className={`percent-change ${parseFloat(percentChange) >= 0 ? 'positive' : 'negative'}`}>
        {parseFloat(percentChange) >= 0 ? '+' : ''}{percentChange}%
      </span>
    </div>
  );
};

export default MiniPriceChart;
