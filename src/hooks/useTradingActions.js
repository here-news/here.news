import { useState, useCallback } from 'react';
import { useUser } from '../UserContext';
import serviceUrl from '../config';

/**
 * Custom hook for trading actions (buy, sell, short, etc.)
 * @param {Object} options - Options for the hook
 * @param {string} options.newsId - News ID for the trade
 * @param {Function} options.onTradeComplete - Callback after trade completion
 * @param {Function} options.refreshPositions - Function to refresh positions data
 * @param {Function} options.refreshMarketData - Function to refresh market data
 * @returns {Object} Trading functions and state
 */
const useTradingActions = ({
  newsId,
  onTradeComplete,
  refreshPositions,
  refreshMarketData
}) => {
  const { publicKey } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Execute a trade (buy, sell, short, short_close)
  const executeTrade = useCallback(async (actionType, shares, currentPrice, userData, userPositions, positionData) => {
    if (!publicKey || !newsId) {
      setError('Authentication required. Please log in to trade.');
      return false;
    }

    if (!shares || isNaN(parseInt(shares)) || parseInt(shares) <= 0) {
      setError('Please enter a valid number of shares.');
      return false;
    }

    if (!currentPrice || isNaN(parseFloat(currentPrice)) || parseFloat(currentPrice) <= 0) {
      setError('Invalid price information. Please try again later.');
      return false;
    }

    // Convert to numbers to ensure we're using correct types
    const sharesInt = parseInt(shares, 10);
    const priceFloat = parseFloat(currentPrice);

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if user has enough shares or balance
      let userShares = 0;
      
      // Check token balances to see if user owns any shares
      if (userData && userData.token_balances) {
        if (typeof userData.token_balances === 'object' && !Array.isArray(userData.token_balances)) {
          userShares = userData.token_balances[newsId] || 0;
        } else if (Array.isArray(userData.token_balances)) {
          const matchingToken = userData.token_balances.find(token => 
            token.news_id === newsId || token.market_id === newsId || token.id === newsId);
            
          if (matchingToken) {
            userShares = matchingToken.balance || matchingToken.amount || matchingToken.shares || 0;
          }
        }
      }
      
      // Check if user has enough balance for buy or enough shares for short/sell
      if (actionType === 'buy') {
        const totalCost = sharesInt * priceFloat;
        if (userData.balance < totalCost) {
          setError(`Not enough balance. Cost: $${totalCost.toFixed(2)}, Available: $${typeof userData.balance === 'number' ? userData.balance.toFixed(2) : '0.00'}`);
          setLoading(false);
          return false;
        }
      } else if (actionType === 'sell') {
        // Check if user has shares using multiple detection methods
        let totalShares = userShares || 0;
        
        // Also check positionData which might contain shares
        if (positionData && positionData.long_shares) {
          totalShares += positionData.long_shares;
        }
        
        // Also check userPositions array
        if (userPositions && userPositions.length > 0) {
          const longPositions = userPositions.filter(pos => pos.type === 'long');
          const positionShares = longPositions.reduce((total, pos) => total + pos.shares, 0);
          
          // If positions have more shares than we detected from token_balances, use that
          if (positionShares > totalShares) {
            totalShares = positionShares;
          }
        }
        
        if (totalShares < sharesInt) {
          setError(`Not enough shares to sell. Attempting to sell ${sharesInt} shares, but you only have ${totalShares}.`);
          setLoading(false);
          return false;
        }
      } else if (actionType === 'short') {
        // For shorting, check if market price is valid for shorting
        if (priceFloat <= 0.01) {
          setError('Cannot short this market at this time. Please try again later.');
          setLoading(false);
          return false;
        }
        
        // Check if user has enough collateral (balance)
        const requiredCollateral = sharesInt * priceFloat * 1.5; // 150% collateral
        if (userData.balance < requiredCollateral) {
          setError(`Insufficient collateral for shorting. Required: $${requiredCollateral.toFixed(2)}, Available: $${typeof userData.balance === 'number' ? userData.balance.toFixed(2) : '0.00'}`);
          setLoading(false);
          return false;
        }
      } else if (actionType === 'short_close') {
        // Check if user has any short positions to close
        const hasShortPositions = userPositions.some(pos => pos.type === 'short');
        if (!hasShortPositions) {
          setError('You don\'t have any short positions to close.');
          setLoading(false);
          return false;
        }
      }
      
      // Map action type to order type
      const orderTypeMap = {
        'buy': 'MARKET',
        'sell': 'MARKET',
        'short': 'MARKET',
        'short_close': 'MARKET'
      };
      
      // Map action type to API 'side' parameter
      const sideMap = {
        'buy': 'buy',
        'sell': 'sell',
        'short': 'sell', // API uses 'sell' for both regular selling and shorting
        'short_close': 'buy' // API uses 'buy' for closing short positions
      };
      
      // Map action type to position effect
      const positionEffectMap = {
        'buy': 'open',
        'sell': 'close',
        'short': 'open',
        'short_close': 'close'
      };
      
      // Map to API expected format
      const orderPayload = {
        type: orderTypeMap[actionType], 
        side: sideMap[actionType],
        quantity: sharesInt,
        price: priceFloat,
        news_id: newsId,
        position_effect: positionEffectMap[actionType]
      };
      
      // Add short_order flag for shorting
      if (actionType === 'short') {
        orderPayload.short_order = true;
      }
      
      const endpoint = `${serviceUrl}/market/${newsId}/orders`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': publicKey
        },
        body: JSON.stringify(orderPayload)
      });
      
      let responseData;
      try {
        const responseText = await response.text();
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing trade response:', e);
        responseData = { success: false, message: 'Could not parse server response' };
      }
      
      if (response.ok && responseData.success) {
        setSuccess(`Successfully ${actionType === 'buy' ? 'bought' : 
                                  actionType === 'sell' ? 'sold' : 
                                  actionType === 'short' ? 'shorted' : 
                                  'closed short position for'} ${sharesInt} share${sharesInt !== 1 ? 's' : ''}.`);
        
        // Refresh positions after successful trade                      
        if (refreshPositions) {
          await refreshPositions();
        }
        
        // Refresh market data 
        if (refreshMarketData) {
          await refreshMarketData();
        }
        
        // Call the onTradeComplete callback if provided
        if (onTradeComplete) {
          onTradeComplete(actionType, sharesInt, priceFloat);
        }
        
        setLoading(false);
        return true;
      } else {
        // Handle error
        let errorMessage;
        if (responseData && responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData && responseData.detail) {
          if (Array.isArray(responseData.detail)) {
            errorMessage = responseData.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
          } else {
            errorMessage = responseData.detail;
          }
        } else {
          errorMessage = `Trade failed: ${response.status} ${response.statusText}`;
        }
        
        setError(errorMessage);
        setLoading(false);
        return false;
      }
    } catch (err) {
      console.error('Error executing trade:', err);
      setError(`Error: ${err.message}`);
      setLoading(false);
      return false;
    }
  }, [publicKey, newsId, onTradeComplete, refreshPositions, refreshMarketData]);

  return {
    executeTrade,
    loading,
    error,
    success,
    setError,
    setSuccess
  };
};

export default useTradingActions;