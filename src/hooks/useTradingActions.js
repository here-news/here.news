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

  // Common validation logic used by both trade types
  const validateTradeParams = useCallback((shares, currentPrice) => {
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

    return true;
  }, [publicKey, newsId]);

  // Handle API request and response
  const processTradeRequest = useCallback(async (orderPayload, actionType, sharesInt) => {
    try {
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
          onTradeComplete(actionType, sharesInt, parseFloat(orderPayload.price));
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

  // Execute a regular trade (buy/sell)
  const executeRegularTrade = useCallback(async (actionType, shares, currentPrice, userData, userPositions, positionData) => {
    if (!validateTradeParams(shares, currentPrice)) {
      return false;
    }

    // Convert to numbers to ensure we're using correct types
    const sharesInt = parseInt(shares, 10);
    const priceFloat = parseFloat(currentPrice);

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Determine the side and type for belief market API
      // For backward compatibility:
      // - 'buy' in legacy = 'YES' + 'BUY' in belief market
      // - 'sell' in legacy = 'YES' + 'SELL' in belief market
      // - 'short' in legacy = 'NO' + 'BUY' in belief market
      // - 'short_close' in legacy = 'NO' + 'SELL' in belief market
      let side = 'YES';
      let type = actionType === 'buy' ? 'BUY' : 'SELL';
      
      // For backward compatibility, check if user has shares
      let totalShares = 0;
      
      // Check for YES shares in belief market format
      if (positionData) {
        if (positionData.yes_shares !== undefined) {
          totalShares = parseFloat(positionData.yes_shares) || 0;
        } else if (positionData.long_shares !== undefined) {
          // Legacy format
          totalShares = parseFloat(positionData.long_shares) || 0;
        }
      }
      
      // Check if user has enough balance for buy or enough shares for sell
      const totalCost = sharesInt * priceFloat;
      
      if (actionType === 'buy') {
        if (userData.balance < totalCost && userData.quote_balance < totalCost) {
          const availableBalance = userData.quote_balance !== undefined ? 
            userData.quote_balance : userData.balance;
            
          setError(`Not enough balance. Cost: $${totalCost.toFixed(2)}, Available: $${typeof availableBalance === 'number' ? availableBalance.toFixed(2) : '0.00'}`);
          setLoading(false);
          return false;
        }
      } else if (actionType === 'sell') {
        // Also check userPositions array for YES positions
        if (userPositions && userPositions.length > 0) {
          const yesPositions = userPositions.filter(pos => 
            pos.type === 'yes' || pos.type === 'long');
          const positionShares = yesPositions.reduce((total, pos) => 
            total + parseFloat(pos.shares), 0);
          
          // If positions have more shares than we detected from positionData, use that
          if (positionShares > totalShares) {
            totalShares = positionShares;
          }
        }
        
        if (totalShares < sharesInt) {
          setError(`Not enough shares to sell. Attempting to sell ${sharesInt} shares, but you only have ${totalShares}.`);
          setLoading(false);
          return false;
        }
      }
      
      // For belief market API:
      // - BUY: amount is in dollars
      // - SELL: amount is in shares
      const amount = actionType === 'buy' ? 
        priceFloat * sharesInt :  // Amount in dollars for BUY
        sharesInt;                // Amount in shares for SELL
      
      const beliefMarketPayload = {
        side,
        type,
        amount
      };
      
      const endpoint = `${serviceUrl}/belief-market/${newsId}/trade`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': publicKey
        },
        body: JSON.stringify(beliefMarketPayload)
      });
      
      let responseData;
      try {
        const responseText = await response.text();
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing trade response:', e);
        responseData = { success: false, message: 'Could not parse server response' };
      }
      
      if (response.ok && (responseData.success || responseData.trade_id)) {
        // Belief market API success
        const actionDescription = type === 'BUY' ? 'bought' : 'sold';
        const sideDescription = side === 'YES' ? 'YES' : 'NO';
        
        setSuccess(`Successfully ${actionDescription} ${sharesInt} ${sideDescription} share${sharesInt !== 1 ? 's' : ''}.`);
        
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
      console.error('Error executing regular trade:', err);
      setError(`Error: ${err.message}`);
      setLoading(false);
      return false;
    }
  }, [newsId, publicKey, validateTradeParams, refreshPositions, refreshMarketData, onTradeComplete]);

  // Execute a short trade (short/short_close) - mapped to NO buy/sell in belief market
  const executeShortTrade = useCallback(async (actionType, shares, currentPrice, userData, userPositions) => {
    if (!validateTradeParams(shares, currentPrice)) {
      return false;
    }

    // Convert to numbers to ensure we're using correct types
    const sharesInt = parseInt(shares, 10);
    const priceFloat = parseFloat(currentPrice);

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // In belief market, a short is just buying NO shares
      // - 'short' in legacy = 'NO' + 'BUY' in belief market
      // - 'short_close' in legacy = 'NO' + 'SELL' in belief market
      const side = 'NO';
      const type = actionType === 'short' ? 'BUY' : 'SELL';
      
      // For short positions, check if we have enough NO shares if we're selling (short_close)
      if (actionType === 'short_close') {
        let totalNoShares = 0;
        
        // Check for NO shares in belief market format
        if (userPositions && userPositions.length > 0) {
          const noPositions = userPositions.filter(pos => 
            pos.type === 'no' || pos.type === 'short');
          totalNoShares = noPositions.reduce((total, pos) => 
            total + parseFloat(pos.shares), 0);
        }
        
        if (totalNoShares < sharesInt) {
          setError(`Not enough NO shares to sell. Attempting to sell ${sharesInt} shares, but you only have ${totalNoShares}.`);
          setLoading(false);
          return false;
        }
      }
      
      // For belief market API:
      // - BUY: amount is in dollars
      // - SELL: amount is in shares
      const amount = type === 'BUY' ? 
        priceFloat * sharesInt :  // Amount in dollars for BUY
        sharesInt;                // Amount in shares for SELL
      
      const beliefMarketPayload = {
        side,
        type,
        amount
      };
      
      const endpoint = `${serviceUrl}/belief-market/${newsId}/trade`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': publicKey
        },
        body: JSON.stringify(beliefMarketPayload)
      });
      
      let responseData;
      try {
        const responseText = await response.text();
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing trade response:', e);
        responseData = { success: false, message: 'Could not parse server response' };
      }
      
      if (response.ok && (responseData.success || responseData.trade_id)) {
        // Belief market API success
        const actionDescription = type === 'BUY' ? 'bought' : 'sold';
        
        setSuccess(`Successfully ${actionDescription} ${sharesInt} NO share${sharesInt !== 1 ? 's' : ''}.`);
        
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
      console.error('Error executing short trade:', err);
      setError(`Error: ${err.message}`);
      setLoading(false);
      return false;
    }
  }, [newsId, publicKey, validateTradeParams, refreshPositions, refreshMarketData, onTradeComplete]);

  // Legacy method to maintain backward compatibility
  const executeTrade = useCallback(async (actionType, shares, currentPrice, userData, userPositions, positionData) => {
    if (actionType === 'short' || actionType === 'short_close') {
      return executeShortTrade(actionType, shares, currentPrice, userData, userPositions);
    } else {
      return executeRegularTrade(actionType, shares, currentPrice, userData, userPositions, positionData);
    }
  }, [executeRegularTrade, executeShortTrade]);

  return {
    executeTrade,
    executeRegularTrade, // New method for buy/sell
    executeShortTrade,   // New method for short/short_close
    loading,
    error,
    success,
    setError,
    setSuccess
  };
};

export default useTradingActions;