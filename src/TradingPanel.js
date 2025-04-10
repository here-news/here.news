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
  const { 
    publicKey, 
    userInfo, 
    userSocketConnected,
    updateUserBalance
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
  const [showExplanation, setShowExplanation] = useState(false);
  
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
    refreshPositions: throttledCheckShares,
    refreshMarketData: throttledFetchMarketData
  });
  
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
  
  const debouncedUpdateUserData = useCallback(
    debounce(() => {
      if (publicKey) {
        updateUserData();
      }
    }, 1000),
    [publicKey, updateUserData]
  );
  
  const handleMarketWebSocketMessage = useCallback((message) => {
    if (!message || typeof message !== 'object') return;
    
    switch(message.type) {
      case 'market_init':
      case 'market_update':
      case 'market_stats':
      case 'market':
      case 'price_history':
        if (marketStats?.yes_price) {
          setPreviousPrice(marketStats.yes_price);
        } else if (marketStats?.current_price) {
          setPreviousPrice(marketStats.current_price);
        }
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
        if (message.data) {
          let tradeData = message.data;
          
          if (tradeData.side) {
            const isBuy = tradeData.type === 'BUY';
            const isYes = tradeData.side === 'YES';
            
            let legacyAction;
            if (isYes && isBuy) legacyAction = 'yes_buy';
            else if (isYes && !isBuy) legacyAction = 'yes_sell';
            else if (!isYes && isBuy) legacyAction = 'no_buy';
            else if (!isYes && !isBuy) legacyAction = 'no_sell';
            
            tradeData.action = legacyAction;
          }
          
          setRecentTrades(prev => [tradeData, ...prev].slice(0, 50));
        }
        
        throttledFetchMarketData();
        throttledCheckShares();
        break;
        
      case 'batch':
        if (Array.isArray(message.data)) {
          message.data.forEach(submessage => {
            handleMarketWebSocketMessage(submessage);
          });
        }
        break;
        
      default:
        if (message.data && message.data.positions) {
          throttledCheckShares();
        }
        break;
    }
  }, [marketStats, throttledFetchMarketData, throttledCheckShares]);
  
  const handleUserWebSocketMessage = useCallback((message) => {
    if (!message || typeof message !== 'object') return;
    
    switch(message.type) {
      case 'user_update':
      case 'balance':
      case 'balance_update':
        if (message.data && typeof message.data.quote_balance !== 'undefined') {
          updateUserBalance(message.data.quote_balance);
        } else if (typeof message.quote_balance !== 'undefined') {
          updateUserBalance(message.quote_balance);
        }
        break;
       
      case 'positions_update':
      case 'position':
        checkUserShares();
        break;
        
      case 'batch':
        if (Array.isArray(message.data)) {
          message.data.forEach(submessage => {
            handleUserWebSocketMessage(submessage);
          });
        }
        break;
        
      default:
        if (message.user_id === publicKey || 
            (message.data && message.data.user_id === publicKey)) {
          updateUserData();
          checkUserShares();
          
          if (message.data && typeof message.data.quote_balance !== 'undefined') {
            updateUserBalance(message.data.quote_balance);
          } else if (typeof message.quote_balance !== 'undefined') {
            updateUserBalance(message.quote_balance);
          }
        }
        
        if (message.data && message.data.positions && message.data.positions[newsId]) {
          checkUserShares();
        }
        break;
    }
  }, [publicKey, newsId, updateUserData, checkUserShares, updateUserBalance]);
  
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
  
  useEffect(() => {
    if (!marketWebSocket.isConnected) return;
    
    const unregisterMarketWebSocket = marketWebSocket.registerForMessageType('market_update', handleMarketWebSocketMessage);
    const unregisterMarketInit = marketWebSocket.registerForMessageType('market_init', handleMarketWebSocketMessage);
    const unregisterMarketStats = marketWebSocket.registerForMessageType('market_stats', handleMarketWebSocketMessage);
    const unregisterMarket = marketWebSocket.registerForMessageType('market', handleMarketWebSocketMessage);
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
  
  useEffect(() => {
    if (!userWebSocket.isConnected) return;
    
    const unregisterUserUpdate = userWebSocket.registerForMessageType('user_update', handleUserWebSocketMessage);
    const unregisterBalance = userWebSocket.registerForMessageType('balance', handleUserWebSocketMessage);
    const unregisterBalanceUpdate = userWebSocket.registerForMessageType('balance_update', handleUserWebSocketMessage);
    const unregisterPositionsUpdate = userWebSocket.registerForMessageType('positions_update', handleUserWebSocketMessage);
    const unregisterPosition = userWebSocket.registerForMessageType('position', handleUserWebSocketMessage);
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

  const handlePositionAction = (position) => {
    if (!position) return;
    
    const shares = Math.max(1, Math.floor(position.shares));
    if (shares <= 0) return;
    
    if (position.type === 'yes' || position.type === 'long') {
      const price = marketStats?.yes_price || marketStats?.current_price || 0;
      executeTrade('yes_sell', 1, price, userData, userPositions, positionData);
    } else if (position.type === 'no' || position.type === 'short') {
      const price = marketStats?.no_price || (marketStats?.max_price ? marketStats.max_price - (marketStats.yes_price || marketStats.current_price || 0) : 0);
      executeTrade('no_sell', 1, price, userData, userPositions, positionData);
    }
  };
  
  useEffect(() => {
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
    
    if (publicKey) {
      updateUserData();
    }
  }, [newsId, publicKey, articleTitle]);
  
  const isLoading = marketLoading || positionsLoading || tradeLoading;
  const errorMessage = tradeError || marketError || positionsError || '';
  
  const currentPrice = marketStats?.yes_price || marketStats?.current_price || 0;
  const formattedPrice = currentPrice * 100;
  const formattedPreviousPrice = previousPrice * 100;
  const isPriceUp = formattedPrice > formattedPreviousPrice;
  const isPriceDown = formattedPrice < formattedPreviousPrice;
  const priceChangeAmount = Math.abs(formattedPrice - formattedPreviousPrice).toFixed(1);
  const priceChangePercent = formattedPreviousPrice 
    ? Math.abs((formattedPrice - formattedPreviousPrice) / formattedPreviousPrice * 100).toFixed(1) 
    : '0.0';
    
  const noPrice = marketStats?.no_price || (marketStats?.max_price ? marketStats.max_price - currentPrice : 0);
  const formattedNoPrice = noPrice * 100;
  const beliefRatio = marketStats?.belief_ratio || (marketStats?.max_price ? currentPrice / marketStats.max_price : 0.5);
  const beliefPercentage = (beliefRatio * 100).toFixed(1);
  
  const isRealTimeConnected = marketWebSocket.isConnected && 
    (marketWebSocket.hasRecentHeartbeat || userWebSocket.hasRecentHeartbeat || userSocketConnected);
  
  return (
    <div className="static-trading-panel">
      
      {errorMessage && errorMessage.includes("Authentication") && 
        <div className="error-message">{errorMessage}</div>
      }
      
      {marketStats && (
        <div className="simplified-price-display">
          <div className="belief-meter">
            <div className="belief-label">
              Public Belief
              <span 
                className="info-icon"
                onMouseEnter={() => setShowExplanation(true)}
                onMouseLeave={() => setShowExplanation(false)}
              >
                ⓘ
              </span>
            </div>
            {showExplanation && (
              <div className="belief-explanation-tooltip">
                The price reflects the market's belief. If YES is priced at {formattedPrice.toFixed(1)}¢, 
                NO is priced at {formattedNoPrice.toFixed(1)}¢ because the total belief equals 100%.
              </div>
            )}
            <div className="belief-bar">
              <div className="yes-belief-fill" style={{width: `${beliefPercentage}%`}}>
                <span className="belief-price-label">YES: {formattedPrice.toFixed(1)}¢</span>
              </div>
              <div className="no-belief-fill" style={{width: `${100 - parseFloat(beliefPercentage)}%`}}>
                <span className="belief-price-label">NO: {formattedNoPrice.toFixed(1)}¢</span>
              </div>
            </div>
            <div className="belief-explanation">
              YES: {beliefPercentage}% ● NO: {(100 - parseFloat(beliefPercentage)).toFixed(1)}%
            </div>
          </div>
          
          <MiniPriceChart 
            priceHistory={marketStats.price_history || []} 
            currentPrice={currentPrice}
            lastDirection={isPriceUp ? 'up' : isPriceDown ? 'down' : ''}
          />
        </div>
      )}
          
          <div className="belief-market-actions">
        <div className="action-column">
          <div className="action-block">
            <button 
              type="button"
              onClick={() => executeTrade('buy', 100, currentPrice, userData, userPositions, positionData)}
              disabled={isLoading}
              className="yes-buy-button"
            >
              Support YES @{formattedPrice.toFixed(1)}¢  
            </button>
            {userPositions?.filter(pos => pos.type === 'yes' || pos.type === 'long').map((position, index) => {
              const currentMarketPrice = formattedPrice / 100;
              const profitPerShare = currentMarketPrice - position.avg_price;
              const totalProfit = profitPerShare * position.shares;
              const profitIsPositive = totalProfit > 0;

              return (
                <div key={index} className="position-info">
                  <div className="position-details">
                    <span className="position-shares">{position.shares} shares</span> 
                    <span className="position-price">@{(position.avg_price * 100).toFixed(1)}¢</span>
                    <span className={`position-profit ${profitIsPositive ? 'positive' : 'negative'}`}>
                      ({profitIsPositive ? '+' : ''}{((profitPerShare / position.avg_price) * 100).toFixed(1)}%)
                    </span>
                  </div>
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
              Support NO @{formattedNoPrice.toFixed(1)}¢
            </button>
            {userPositions?.filter(pos => pos.type === 'no' || pos.type === 'short').map((position, index) => {
              const currentMarketPrice = formattedNoPrice / 100;
              const profitPerShare = currentMarketPrice - position.avg_price;
              const totalProfit = profitPerShare * position.shares;
              const profitIsPositive = totalProfit > 0;

              return (
                <div key={index} className="position-info">
                  <div className="position-details">
                    <span className="position-shares">{position.shares} shares</span> 
                    <span className="position-price">@{(position.avg_price * 100).toFixed(1)}¢</span>
                    <span className={`position-profit ${profitIsPositive ? 'positive' : 'negative'}`}>
                      ({profitIsPositive ? '+' : ''}{((profitPerShare / position.avg_price) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="condensed-stats">
        <div className="stat-pair">
          <div className="stat-item">
            <span className="stat-label">Market Cap</span>
            <span className="stat-value">
              ${(() => {
                if (marketStats?.yes_price && marketStats?.volume_yes && 
                marketStats?.no_price && marketStats?.volume_no) {
                  const calculatedMarketCap = 
                    marketStats.yes_price * marketStats.volume_yes + 
                    marketStats.no_price * marketStats.volume_no;
                  return calculatedMarketCap.toFixed(2);
                } else if (marketStats?.market_cap && typeof marketStats.market_cap === 'number') {
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

    </div>
  );
};

export default TradingPanel;