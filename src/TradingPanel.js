import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from './UserContext';
import serviceUrl from './config';
import './TradingPanel.css';
import PriceBar from './PriceBar';
import PositionPanel from './PositionPanel';
import MiniPriceChart from './MiniPriceChart';
import { useMarketData, useUserPositions, useWebSocketConnection, useTradingActions } from './hooks';

// Simple debounce function
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Enhanced version with custom hooks for better organization and reusability
const TradingPanel = ({ newsId, onTradeComplete }) => {
  // Add updateUserBalance to the destructured values from useUser
  const { 
    publicKey, 
    userInfo, 
    userSocketConnected,
    updateUserBalance // Add this line 
  } = useUser();
  
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
    fetchMarketData,
    throttledFetchMarketData
  } = useMarketData(newsId);
  
  const {
    userOwnedShares,
    userHasAccess, 
    isLoading: positionsLoading,
    error: positionsError,
    userPositions,
    positionData,
    checkUserShares,
    throttledCheckShares
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
    refreshPositions: throttledCheckShares, // Use throttled version to prevent flooding
    refreshMarketData: throttledFetchMarketData // Use throttled version to prevent flooding
  });
  
  // Fetch user data from REST API
  const updateUserData = useCallback(async () => {
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
  }, [publicKey]);
  
  // Debounced version of updateUserData to prevent flooding
  const debouncedUpdateUserData = useCallback(
    debounce(() => {
      if (publicKey) {
        updateUserData();
      }
    }, 1000),
    [publicKey, updateUserData]
  );
  
  // Handle WebSocket market updates with memoization to prevent rerenders
  const handleMarketWebSocketMessage = useCallback((message) => {
    if (!message || typeof message !== 'object') return;
    
    switch(message.type) {
      case 'market_init':
      case 'market_update':
      case 'market_stats':
      case 'market': // New belief market update type
      case 'price_history': // Handle price history update messages
        // Store previous price for change visualization
        if (marketStats?.yes_price) {
          setPreviousPrice(marketStats.yes_price);
        } else if (marketStats?.current_price) {
          setPreviousPrice(marketStats.current_price);
        }
        // Refresh market data through our hook - using throttled version
        throttledFetchMarketData();
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
          // For belief market trade messages, convert to standard format if needed
          let tradeData = message.data;
          
          // Check if this is a belief market trade with side field
          if (tradeData.side) {
            // Convert belief market trade to backward compatibility format
            const isBuy = tradeData.type === 'BUY';
            const isYes = tradeData.side === 'YES';
            
            // Map to belief market actions for display purposes
            let legacyAction;
            if (isYes && isBuy) legacyAction = 'yes_buy';
            else if (isYes && !isBuy) legacyAction = 'yes_sell';
            else if (!isYes && isBuy) legacyAction = 'no_buy';
            else if (!isYes && !isBuy) legacyAction = 'no_sell';
            
            // Add legacy action field for backward compatibility
            tradeData.action = legacyAction;
          }
          
          setRecentTrades(prev => [tradeData, ...prev].slice(0, 50));
        }
        
        // Also refresh market data and positions - using throttled versions
        throttledFetchMarketData();
        throttledCheckShares();
        break;
        
      case 'batch':
        // Handle batched messages (process each one)
        if (Array.isArray(message.data)) {
          message.data.forEach(submessage => {
            handleMarketWebSocketMessage(submessage);
          });
        }
        break;
        
      default:
        // Check for positions updates for backward compatibility
        if (message.data && message.data.positions) {
          throttledCheckShares();
        }
        break;
    }
  }, [marketStats, throttledFetchMarketData, throttledCheckShares]);
  
  // Handle user WebSocket updates with memoization to prevent rerenders
  const handleUserWebSocketMessage = useCallback((message) => {
    if (!message || typeof message !== 'object') return;
    
    switch(message.type) {
      case 'user_update':
      case 'balance':
      case 'balance_update':
        console.log("Balance update message detected");
        if (message.data && typeof message.data.quote_balance !== 'undefined') {
          console.log("Calling updateUserBalance with:", message.data.quote_balance);
          updateUserBalance(message.data.quote_balance);
        } else if (typeof message.quote_balance !== 'undefined') {
          console.log("Calling updateUserBalance with:", message.quote_balance);
          updateUserBalance(message.quote_balance);
        }
        break;
       
      case 'positions_update':
      case 'position': // New belief market position update type
        // Refresh positions through our hook
        checkUserShares();
        break;
        
      case 'batch':
        // Handle batched messages (process each one)
        if (Array.isArray(message.data)) {
          message.data.forEach(submessage => {
            handleUserWebSocketMessage(submessage);
          });
        }
        break;
        
      default:
        // Check common patterns in different message formats
        if (message.user_id === publicKey || 
            (message.data && message.data.user_id === publicKey)) {
          // This message is for the current user, update data
          updateUserData();
          checkUserShares();
          
          // Also check for balance updates in various formats
          if (message.data && typeof message.data.quote_balance !== 'undefined') {
            updateUserBalance(message.data.quote_balance);
          } else if (typeof message.quote_balance !== 'undefined') {
            updateUserBalance(message.quote_balance);
          }
        }
        
        // Check for positions in message.data.positions (belief market format)
        if (message.data && message.data.positions && message.data.positions[newsId]) {
          checkUserShares();
        }
        break;
    }
  }, [publicKey, newsId, updateUserData, checkUserShares, updateUserBalance]);
  
  // Setup WebSocket connections
  const marketWebSocket = useWebSocketConnection({
    endpoint: `/ws/market/${newsId}`,
    newsId,
    publicKey
  });
  
  const userWebSocket = useWebSocketConnection({
    endpoint: `/ws/user/${publicKey || '0'}`,
    newsId,
    publicKey
  });
  
  // Register for market message types
  useEffect(() => {
    if (!marketWebSocket.isConnected) return;
    
    // Register for market messages - including belief market types
    const unregisterMarketWebSocket = marketWebSocket.registerForMessageType('market_update', handleMarketWebSocketMessage);
    const unregisterMarketInit = marketWebSocket.registerForMessageType('market_init', handleMarketWebSocketMessage);
    const unregisterMarketStats = marketWebSocket.registerForMessageType('market_stats', handleMarketWebSocketMessage);
    const unregisterMarket = marketWebSocket.registerForMessageType('market', handleMarketWebSocketMessage); // New belief market type
    const unregisterOrderBook = marketWebSocket.registerForMessageType('order_book_update', handleMarketWebSocketMessage);
    const unregisterOrderBookUpdate = marketWebSocket.registerForMessageType('order_book', handleMarketWebSocketMessage);
    const unregisterTrade = marketWebSocket.registerForMessageType('trade_executed', handleMarketWebSocketMessage);
    const unregisterTradeExecuted = marketWebSocket.registerForMessageType('trade', handleMarketWebSocketMessage);
    const unregisterBatch = marketWebSocket.registerForMessageType('batch', handleMarketWebSocketMessage);
    
    return () => {
      unregisterMarketWebSocket();
      unregisterMarketInit();
      unregisterMarketStats();
      unregisterMarket();
      unregisterOrderBook();
      unregisterOrderBookUpdate();
      unregisterTrade();
      unregisterTradeExecuted();
      unregisterBatch();
    };
  }, [marketWebSocket.isConnected, marketWebSocket.registerForMessageType, handleMarketWebSocketMessage]);
  
  // Register for user message types
  useEffect(() => {
    if (!userWebSocket.isConnected) return;
    
    // Register for user messages - including belief market types
    const unregisterUserUpdate = userWebSocket.registerForMessageType('user_update', handleUserWebSocketMessage);
    const unregisterBalance = userWebSocket.registerForMessageType('balance', handleUserWebSocketMessage);
    const unregisterBalanceUpdate = userWebSocket.registerForMessageType('balance_update', handleUserWebSocketMessage);
    const unregisterPositionsUpdate = userWebSocket.registerForMessageType('positions_update', handleUserWebSocketMessage);
    const unregisterPosition = userWebSocket.registerForMessageType('position', handleUserWebSocketMessage); // New belief market type
    const unregisterBalanceField = userWebSocket.registerForMessageType('field:quote_balance', handleUserWebSocketMessage);
    const unregisterBatch = userWebSocket.registerForMessageType('batch', handleUserWebSocketMessage);
    
    return () => {
      unregisterUserUpdate();
      unregisterBalance();
      unregisterBalanceUpdate();
      unregisterPositionsUpdate();
      unregisterPosition();
      unregisterBalanceField();
      unregisterBatch();
    };
  }, [userWebSocket.isConnected, userWebSocket.registerForMessageType, handleUserWebSocketMessage]);

  // Helper function for position actions - support belief market positions
  const handlePositionAction = (position) => {
    if (!position) return;
    
    // Ensure integer shares (>=0)
    const shares = Math.max(1, Math.floor(position.shares));
    if (shares <= 0) return;
    
    // Handle belief market position types (yes/no) and legacy types (long/short)
    if (position.type === 'yes' || position.type === 'long') {
      // Sell YES position (or legacy long)
      const price = marketStats?.yes_price || marketStats?.current_price || 0;
      // Always sell 1 share when using the sell button
      executeTrade('yes_sell', 1, price, userData, userPositions, positionData);
    } else if (position.type === 'no' || position.type === 'short') {
      // Sell NO position (or legacy short)
      const price = marketStats?.no_price || (marketStats?.max_price ? marketStats.max_price - (marketStats.yes_price || marketStats.current_price || 0) : 0);
      // Always sell 1 share when using the sell button
      executeTrade('no_sell', 1, price, userData, userPositions, positionData);
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
  
  // Format market data for belief market trading panel
  // For backward compatibility, use yes_price as current_price if available
  const currentPrice = marketStats?.yes_price || marketStats?.current_price || 0;
  const formattedPrice = currentPrice * 100; // Convert to cents
  const formattedPreviousPrice = previousPrice * 100; // Convert to cents
  const isPriceUp = formattedPrice > formattedPreviousPrice;
  const isPriceDown = formattedPrice < formattedPreviousPrice;
  const priceChangeAmount = Math.abs(formattedPrice - formattedPreviousPrice).toFixed(1);
  const priceChangePercent = formattedPreviousPrice 
    ? Math.abs((formattedPrice - formattedPreviousPrice) / formattedPreviousPrice * 100).toFixed(1) 
    : '0.0';
    
  // Belief market data
  const noPrice = marketStats?.no_price || (marketStats?.max_price ? marketStats.max_price - currentPrice : 0);
  const formattedNoPrice = noPrice * 100; // Convert to cents
  const beliefRatio = marketStats?.belief_ratio || (marketStats?.max_price ? currentPrice / marketStats.max_price : 0.5);
  const beliefPercentage = (beliefRatio * 100).toFixed(1);
  
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
      
      {/* Price indicator, chart, and connection status for belief market */}
      {marketStats && (
        <div className="simplified-price-display">
          <div className="belief-meter">
            <div className="belief-label">Belief Ratio: {beliefPercentage}%</div>
            <div className="belief-bar">
              <div className="belief-fill" style={{width: `${beliefPercentage}%`}}></div>
            </div>
          </div>
          
          {/* Price History Chart */}
          <MiniPriceChart 
            priceHistory={marketStats.price_history || []} 
            currentPrice={currentPrice}
            lastDirection={isPriceUp ? 'up' : isPriceDown ? 'down' : ''}
          />
        </div>
      )}

      {/* Stats Section - only key stats */}
        <div className="condensed-stats">
          <div className="stat-pair">
            <div className="stat-item">
          <span className="stat-label">Market Cap</span>
          <span className="stat-value">
            ${(() => {
              // Calculate market cap as yes_price*volume_yes + no_price*volume_no
              if (marketStats?.yes_price && marketStats?.volume_yes && 
              marketStats?.no_price && marketStats?.volume_no) {
            const calculatedMarketCap = 
              marketStats.yes_price * marketStats.volume_yes + 
              marketStats.no_price * marketStats.volume_no;
            return calculatedMarketCap.toFixed(2);
              } else if (marketStats?.market_cap && typeof marketStats.market_cap === 'number') {
            // Fallback to existing market_cap if calculation isn't possible
            return marketStats.market_cap.toFixed(2);
              }
              return '0.00';
            })()}
          </span>
            </div>
            <div className="stat-item">
          <span className="stat-label">Traders</span>
          <span className="stat-value">{marketStats?.user_count || tradersCount || '0'}</span>
            </div>
          </div>
          <div className="stat-pair">
            <div className="stat-item">
          <span className="stat-label">YES Volume</span>
          <span className="stat-value">{marketStats?.volume_yes ? Math.floor(marketStats.volume_yes) : '0'}</span>
            </div>
            <div className="stat-item">
          <span className="stat-label">NO Volume</span>
          <span className="stat-value">{marketStats?.volume_no ? Math.floor(marketStats.volume_no) : '0'}</span>
            </div>
          </div>
        </div>
          
        {/* Belief Market Trading Buttons with YES/NO options */}
      <div className="belief-market-actions">
        <div className="action-column">
          <div className="action-block">
            <button 
              type="button"
              onClick={() => executeTrade('buy', 100, currentPrice, userData, userPositions, positionData)}
              disabled={isLoading}
              className="yes-buy-button"
            >
              Pump ▲  @{formattedPrice.toFixed(1)}¢  
            </button>
            {userPositions?.filter(pos => pos.type === 'yes' || pos.type === 'long').map((position, index) => {
              const currentMarketPrice = formattedPrice / 100; // YES price in dollars
              const profitPerShare = currentMarketPrice - position.avg_price;
              const totalProfit = profitPerShare * position.shares;
              const profitIsPositive = totalProfit > 0;

                return (
                <div key={index} className="position-info">
                  {position.shares} shares @~{(position.avg_price * 100).toFixed(1)}¢
                  <span style={{ color: profitIsPositive ? 'green' : 'red' }}>
                  ({profitIsPositive ? '+' : ''}{((profitPerShare / position.avg_price) * 100).toFixed(1)}%)
                  </span>
                </div>
                );
            })}
          </div>
          <hr />
          <div className="action-block">
            <button 
              type="button"
              onClick={() => executeTrade('no_buy', 100, noPrice, userData, userPositions, positionData)}
              disabled={isLoading}
              className="no-buy-button"
            >
              Dump ▼ @{formattedNoPrice.toFixed(1)}¢
            </button>
            {userPositions?.filter(pos => pos.type === 'no' || pos.type === 'short').map((position, index) => {
              const currentMarketPrice = formattedNoPrice / 100; // NO price in dollars
              const profitPerShare = currentMarketPrice - position.avg_price;
              const totalProfit = profitPerShare * position.shares;
              const profitIsPositive = totalProfit > 0;

                return (
                <div key={index} className="position-info">
                  {position.shares} shares @~{(position.avg_price * 100).toFixed(1)}¢
                  <span style={{ color: profitIsPositive ? 'green' : 'red' }}>
                  ({profitIsPositive ? '+' : ''}{((profitPerShare / position.avg_price) * 100).toFixed(1)}%)
                  </span>
                </div>
                );
            })}
          </div>
        </div>
      </div>


    </div>
  );
};

export default TradingPanel;