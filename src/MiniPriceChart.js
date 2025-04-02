import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * MiniPriceChart component for displaying price history in a small chart
 * @param {Object} props Component props
 * @param {Array} props.priceHistory Array of price history points with timestamp and price
 * @param {number} props.currentPrice Current YES price
 * @param {string} props.lastDirection Last price movement direction ('up', 'down', or '')
 * @returns {JSX.Element} Mini price chart component
 */
const MiniPriceChart = ({ priceHistory = [], currentPrice = 0, lastDirection = '' }) => {
  // No data to display
  if (!priceHistory || priceHistory.length === 0) {
    return (
      <div className="mini-price-chart empty-chart">
        <div className="no-data-message">No price history available</div>
      </div>
    );
  }

  // Format data for the chart
  const chartData = priceHistory.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: parseFloat(item.price) * 100, // Convert to cents
    rawTime: new Date(item.timestamp)
  })).sort((a, b) => a.rawTime - b.rawTime); // Sort by time ascending for the chart

  // Calculate min and max prices for the Y axis with some padding
  const prices = chartData.map(item => item.price);
  const minPrice = Math.max(0, Math.floor(Math.min(...prices) * 0.95));
  const maxPrice = Math.ceil(Math.max(...prices) * 1.05);

  // Format the current price in cents with 1 decimal place
  const formattedCurrentPrice = (currentPrice * 100).toFixed(1);

  return (
    <div className="mini-price-chart-container">
      <div className="chart-price-overlay">
        <div className={`chart-current-price ${lastDirection}`}>
          {formattedCurrentPrice}¢
          {lastDirection === 'up' && <span className="chart-direction-arrow">▲</span>}
          {lastDirection === 'down' && <span className="chart-direction-arrow">▼</span>}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={120}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" vertical={false} />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10, fill: '#666' }}
            interval="preserveStartEnd"
            tickCount={5}
          />
          <YAxis 
            domain={[minPrice, maxPrice]} 
            tick={{ fontSize: 10, fill: '#666' }}
            tickFormatter={(value) => `${value}¢`}
            width={30}
          />
          <Tooltip 
            formatter={(value) => [`${value.toFixed(1)}¢`, 'Price']}
            labelFormatter={(time) => `Time: ${time}`}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd' }}
            itemStyle={{ color: '#333' }}
            labelStyle={{ color: '#666' }}
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#34c759" 
            strokeWidth={2}
            dot={false} 
            activeDot={{ r: 5, stroke: '#34c759', strokeWidth: 1, fill: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MiniPriceChart;