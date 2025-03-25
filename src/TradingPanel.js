import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import serviceUrl from './config';
import './TradingPanel.css';
import PriceBar from './PriceBar';
import PositionPanel from './PositionPanel';
import { useMarketData, useUserPositions, useWebSocketConnection, useTradingActions } from './hooks';

// Enhanced version with custom hooks for better organization and reusability
const TradingPanel = ({ newsId, onTradeComplete }) => {
  const { publicKey, userInfo, userSocketConnected } = useUser();
  const [previousPrice, setPreviousPrice] = useState(0);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState([]);
  const [userData, setUserData] = useState(null);
  const [articleTitle, setArticleTitle] = useState('');
  const [issuanceTiers, setIssuanceTiers] = useState([
    { price: 6, description: "Next Issuance Tier @ 6¢" },
    { price: 7, description: "Issuance Tier @ 7¢" }
  ]);
  
  // Custom hooks for data and actions
  const { 
    marketStats,
    trending,
    newsValue,
    tradersCount, 
    tradeVolume,
    isLoading: marketLoading,
    error: marketError,
    fetchMarketData
  } = useMarketData(newsId);
  
  const {
    userOwnedShares,
    userHasAccess, 
    isLoading: positionsLoading,
    error: positionsError,
    userPositions,
    positionData,
    checkUserShares
  } = useUserPositions(newsId);
  
  // Trading actions hook
  const {
    executeTrade,
    loading: tradeLoading,
    error: tradeError,
    success: tradeSuccess,
    setError,
    setSuccess
  } = useTradingActions({
    newsId,
    onTradeComplete,
    refreshPositions: checkUserShares,
    refreshMarketData: fetchMarketData
  });
  
  // Handle WebSocket market updates
  const handleMarketWebSocketMessage = (message) => {
    if (!message || typeof message !== 'object') return;
    
    switch(message.type) {
      case 'market_init':
      case 'market_update':
      case 'market_stats':
        // Store previous price for change visualization
        if (marketStats?.current_price) {
          setPreviousPrice(marketStats.current_price);
        }
        // Refresh market data through our hook
        fetchMarketData();
        break;
        
      case 'order_book_update':
      case 'order_book':
        if (message.data && message.data.order_book) {
          setOrderBook(message.data.order_book);
        } else if (message.order_book) {
          setOrderBook(message.order_book);
        }
        break;
        
      case 'trade_executed':
      case 'trade':
        // Add the new trade to recent trades
        if (message.data) {
          setRecentTrades(prev => [message.data, ...prev].slice(0, 50));
        }
        
        // Also refresh market data and positions
        fetchMarketData();
        checkUserShares();
        break;
        
      default:
        // Check for positions updates for backward compatibility
        if (message.data && message.data.positions) {
          checkUserShares();
        }
        break;
    }
  };
  
  // Handle user WebSocket updates 
  const handleUserWebSocketMessage = (message) => {
    if (!message || typeof message !== 'object') return;
    
    switch(message.type) {
      case 'user_update':
      case 'balance_update':
        // Update user data on balance changes
        updateUserData();
        break;
        
      case 'position_update':
      case 'positions_update':
        // Refresh positions through our hook
        checkUserShares();
        break;
        
      default:
        // Check common patterns in different message formats
        if (message.user_id === publicKey || 
            (message.data && message.data.user_id === publicKey)) {
          // This message is for the current user, update data
          updateUserData();
          checkUserShares();
        }
        break;
    }
  };
  
  // Setup WebSocket connections
  const marketWebSocket = useWebSocketConnection({
    endpoint: `/ws/market/${newsId}`,
    newsId,
    publicKey,
    onMessage: handleMarketWebSocketMessage
  });
  
  const userWebSocket = useWebSocketConnection({
    endpoint: `/ws/user/${publicKey || '0'}`,
    newsId,
    publicKey,
    onMessage: handleUserWebSocketMessage
  });
  
  // Fetch user data from REST API
  const updateUserData = async () => {
    if (!publicKey) return;
    
    try {
      const timestamp = Date.now();
      const response = await fetch(`${serviceUrl}/me?t=${timestamp}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': publicKey,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Helper function for position actions
  const handlePositionAction = (position) => {
    if (!position) return;
    
    if (position.type === 'long') {
      executeTrade('sell', position.shares, marketStats?.current_price || 0, userData, userPositions, positionData);
    } else if (position.type === 'short') {
      executeTrade('short_close', position.shares, marketStats?.current_price || 0, userData, userPositions, positionData);
    }
  };
  
  // Initial data fetching
  useEffect(() => {
    // Fetch market title if needed
    if (!articleTitle && newsId) {
      fetch(`${serviceUrl}/news/${newsId}`)
        .then(response => response.json())
        .then(data => {
          if (data && data.title) {
            setArticleTitle(data.title);
          }
        })
        .catch(error => console.error('Error fetching article title:', error));
    }
    
    // Get initial user data if logged in
    if (publicKey) {
      updateUserData();
    }
  }, [newsId, publicKey, articleTitle]);
  
  // Loading and error states
  const isLoading = marketLoading || positionsLoading || tradeLoading;
  const errorMessage = tradeError || marketError || positionsError || '';
  
  // Format market data for simplified trading panel
  const formattedPrice = (marketStats?.current_price || 0) * 100; // Convert to cents
  const formattedPreviousPrice = previousPrice * 100; // Convert to cents
  const isPriceUp = formattedPrice > formattedPreviousPrice;
  const isPriceDown = formattedPrice < formattedPreviousPrice;
  const priceChangeAmount = Math.abs(formattedPrice - formattedPreviousPrice).toFixed(1);
  const priceChangePercent = formattedPreviousPrice 
    ? Math.abs((formattedPrice - formattedPreviousPrice) / formattedPreviousPrice * 100).toFixed(1) 
    : '0.0';
  
  // Determine connection status based on websocket state and heartbeats
  const isRealTimeConnected = marketWebSocket.isConnected && 
    (marketWebSocket.hasRecentHeartbeat || userWebSocket.hasRecentHeartbeat || userSocketConnected);
  
  return (
    <div className="static-trading-panel">
      <h2>{articleTitle || 'Market Trading'}</h2>
      
      {/* Only show auth error messages at the top, trading errors will appear in position panel */}
      {errorMessage && errorMessage.includes("Authentication") && 
        <div className="error-message">{errorMessage}</div>
      }
      
      {/* Price indicator and connection status (simplified) */}
      {marketStats && (
        <div className="simplified-price-display">
          <div className={`price-value ${isPriceUp ? 'price-up' : isPriceDown ? 'price-down' : ''}`}>
            <span className="current-price">{formattedPrice.toFixed(1)}¢</span>
            <span className="price-change">
              {formattedPreviousPrice !== formattedPrice && (
                <>
                  <span className="price-arrow">{isPriceUp ? '▲' : '▼'}</span>
                  <span className="change-amount">
                    {priceChangeAmount}¢ ({priceChangePercent}%)
                  </span>
                </>
              )}
            </span>
            <span className={`connection-indicator ${isRealTimeConnected ? 'connected' : 'disconnected'}`} 
                  title={isRealTimeConnected ? 'Real-time data' : 'Auto-refresh data'}>
            </span>
          </div>
        </div>
      )}
      
      {/* Prominent Trading Buttons with thumbs up/down emojis */}
      <div className="prominent-trading-actions">
        <div className="quantity-selector">
          <button 
            type="button"
            onClick={() => executeTrade('buy', 1, marketStats?.current_price || 0, userData, userPositions, positionData)}
            disabled={isLoading}
            className="buy-long-button"
          >
            <span className="button-direction">👍</span> Yup (1)
          </button>
          
          <button 
            type="button"
            onClick={() => executeTrade('short', 1, marketStats?.current_price || 0, userData, userPositions, positionData)}
            disabled={isLoading}
            className="sell-short-button"
          >
            <span className="button-direction">👎</span> Nah (1) 
          </button>
        </div>
      </div>
      
      {/* Stats Section - only key stats */}
      <div className="condensed-stats">
        <div className="stat-pair">
          <div className="stat-item">
            <span className="stat-label">Market Cap</span>
            <span className="stat-value">${marketStats?.market_cap && typeof marketStats.market_cap === 'number' ? marketStats.market_cap.toFixed(2) : '0.00'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Traders</span>
            <span className="stat-value">{marketStats?.user_count || tradersCount || '0'}</span>
          </div>
        </div>
      </div>
      
      {/* User Positions - only show when user is logged in and has positions */}
      {publicKey && userPositions && userPositions.length > 0 ? (
        <PositionPanel
          key="position-panel"
          positions={userPositions}
          currentPrice={formattedPrice} // Already converted to cents
          onSellPosition={handlePositionAction}
          successMessage={tradeSuccess}
          errorMessage={errorMessage && !errorMessage.includes("Authentication") ? errorMessage : null}
        />
      ) : (
        // Show success/error messages even when there are no positions
        <div className="no-positions-container">
          {tradeSuccess && <div className="success-message">{tradeSuccess}</div>}
          {errorMessage && !errorMessage.includes("Authentication") && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TradingPanel;