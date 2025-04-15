import { useState, useCallback } from 'react';
import { useUser } from '../UserContext';
import serviceUrl from '../config';
import { apiRequest } from '../services/api';

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

  // Execute a YES position trade (buy/sell) - handles buying or selling YES positions
  const executeRegularTrade = useCallback(async (actionType, shares, currentPrice, userData, userPositions, positionData) => {
    if (!validateTradeParams(shares, currentPrice)) {
      return false;
    }
    
    // Convert to numbers to ensure we're using correct types
    const sharesInt = parseInt(shares);
    const priceFloat = parseFloat(currentPrice);

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (actionType === 'sell') {
        // Also check userPositions array for YES positions
        let totalShares = 0;
        
        if (positionData && typeof positionData.yes_shares === 'number') {
          totalShares = Math.max(0, Math.floor(positionData.yes_shares));
        }
        
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
      // API now expects "shares" parameter (integer) instead of amount
      // - BUY: shares is the number of shares to buy (minimum 1)
      // - SELL: shares is the number of shares to sell (minimum 1)
      
      // API now expects "shares" parameter for all operations (integer)
      // For our "Buy 1 Share" button special case (sharesInt=100), we use 1 share
      let shares;
      if (sharesInt === 100) {
        // The button label says "Buy 1 YES Share" so we use 1 share
        shares = 1;
      } else {
        // Otherwise use the provided shares value, ensure minimum of 1
        shares = Math.max(1, sharesInt);
      }
      
      // Updated payload structure to match new API requirements
      const beliefMarketPayload = {
        side: 'YES',
        type: actionType.toUpperCase(),
        shares // API now expects shares instead of amount
      };
      
      const endpoint = `${serviceUrl}/belief-market/${newsId}/trade`;
      
      // Use our enhanced apiRequest with JWT authentication for trading operations
      const response = await apiRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(beliefMarketPayload)
      }, true); // Mark as protected for JWT
      
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
        const actionDescription = actionType === 'buy' ? 'bought' : 'sold';
        
        // Always display 1 share when using our "Buy 1 Share" button (sharesInt=100)
        // This is a special case where we're using a fixed sharesInt value to indicate 
        // the user wants to buy 1 share at a fixed price
        const displayShares = (actionType === 'buy' && sharesInt === 100) ? 1 : sharesInt;
        
        setSuccess(`Successfully ${actionDescription} ${displayShares} YES share${displayShares !== 1 ? 's' : ''}.`);
        
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

  // Execute a NO position trade (buy/sell) - handles buying or selling NO positions
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
      // In belief market, we directly specify NO side
      const side = 'NO';
      const type = actionType === 'buy' ? 'BUY' : 'SELL';
      
      // For NO positions, check if we have enough shares if we're selling
      if (type === 'SELL') {
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
      // API now expects "shares" parameter (integer) instead of amount
      // - BUY: shares is the number of shares to buy (minimum 1)
      // - SELL: shares is the number of shares to sell (minimum 1)
      
      // API now expects "shares" parameter for all operations (integer)
      // For our "Buy 1 Share" button special case (sharesInt=100), we use 1 share
      let shares;
      if (sharesInt === 100) {
        // The button label says "Buy 1 NO Share" so we use 1 share
        shares = 1;
      } else {
        // Otherwise use the provided shares value, ensure minimum of 1
        shares = Math.max(1, sharesInt);
      }
      
      // Updated payload structure to match new API requirements
      const beliefMarketPayload = {
        side,
        type,
        shares // API now expects shares instead of amount
      };
      
      const endpoint = `${serviceUrl}/belief-market/${newsId}/trade`;
      
      // Use our enhanced apiRequest with JWT authentication
      const response = await apiRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(beliefMarketPayload)
      }, true); // Mark as protected for JWT
      
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
        
        // Always display 1 share when using our "Buy 1 Share" button (sharesInt=100)
        // This is a special case where we're using a fixed sharesInt value to indicate 
        // the user wants to buy 1 share at a fixed price
        const displayShares = (type === 'BUY' && sharesInt === 100) ? 1 : sharesInt;
        
        setSuccess(`Successfully ${actionDescription} ${displayShares} NO share${displayShares !== 1 ? 's' : ''}.`);
        
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

  // Main trade execution method that dispatches to the appropriate handler
  const executeTrade = useCallback(async (actionType, shares, currentPrice, userData, userPositions, positionData) => {
    // Map the new action types to the appropriate functions and parameters
    if (actionType === 'no_buy') {
      // Buy NO position - pass to executeShortTrade with adjusted action type
      return executeShortTrade('buy', shares, currentPrice, userData, userPositions);
    } else if (actionType === 'no_sell') {
      // Sell NO position - pass to executeShortTrade with adjusted action type
      return executeShortTrade('sell', shares, currentPrice, userData, userPositions);
    } else if (actionType === 'yes_sell') {
      // Sell YES position - pass to executeRegularTrade with adjusted action type
      return executeRegularTrade('sell', shares, currentPrice, userData, userPositions, positionData);
    } else if (actionType === 'short' || actionType === 'short_close') {
      // Legacy action types - maintain for backward compatibility
      return executeShortTrade(actionType === 'short' ? 'buy' : 'sell', shares, currentPrice, userData, userPositions);
    } else {
      // Default to regular trade (buy/sell YES)
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