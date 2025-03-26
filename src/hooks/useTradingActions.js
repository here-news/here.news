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
      
      // Check if user has enough balance for buy or enough shares for sell
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
      }
      
      // Map to API expected format for regular trades
      const orderPayload = {
        type: 'MARKET', 
        side: actionType, // 'buy' or 'sell'
        quantity: sharesInt,
        price: priceFloat,
        news_id: newsId,
        position_effect: actionType === 'buy' ? 'open' : 'close'
      };
      
      return await processTradeRequest(orderPayload, actionType, sharesInt);
    } catch (err) {
      console.error('Error executing regular trade:', err);
      setError(`Error: ${err.message}`);
      setLoading(false);
      return false;
    }
  }, [newsId, validateTradeParams, processTradeRequest]);

  // Execute a short trade (short/short_close)
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
      if (actionType === 'short') {
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
        
        // Use the dedicated short position endpoint for shorting
        const shortRequest = {
          shares: sharesInt,
          price: priceFloat
        };
        
        try {
          const endpoint = `${serviceUrl}/market/${newsId}/short`;
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Public-Key': publicKey
            },
            body: JSON.stringify(shortRequest)
          });
          
          let responseData;
          try {
            const responseText = await response.text();
            responseData = JSON.parse(responseText);
          } catch (e) {
            console.error('Error parsing short response:', e);
            responseData = { success: false, message: 'Could not parse server response' };
          }
          
          if (response.ok && (responseData.success || responseData.id)) {
            setSuccess(`Successfully shorted ${sharesInt} share${sharesInt !== 1 ? 's' : ''}.`);
            
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
              errorMessage = `Short trade failed: ${response.status} ${response.statusText}`;
            }
            
            setError(errorMessage);
            setLoading(false);
            return false;
          }
        } catch (err) {
          console.error('Error executing short position:', err);
          setError(`Error: ${err.message}`);
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
        
        // Find the short position ID
        let shortPositionId = null;
        
        try {
          // Try to get user's shorts to find the right one to close
          const userShortsEndpoint = `${serviceUrl}/me/shorts`;
          const userShortsResponse = await fetch(userShortsEndpoint, {
            headers: {
              'Content-Type': 'application/json',
              'X-Public-Key': publicKey
            }
          });
          
          if (userShortsResponse.ok) {
            const userShorts = await userShortsResponse.json();
            if (userShorts && Array.isArray(userShorts) && userShorts.length > 0) {
              // Find open shorts for this news ID
              console.log('User shorts:', userShorts);
              const openShorts = userShorts.filter(s => 
                s.status === 'OPEN' && 
                (s.news_id === newsId || s.market_id === newsId)
              );
              
              if (openShorts.length > 0) {
                shortPositionId = openShorts[0].short_id || openShorts[0].id;
                console.log('Found short position with ID:', shortPositionId);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user shorts:", error);
        }
        
        // Try market-based close first if no specific position ID was found
        if (!shortPositionId) {
          console.log('No specific short ID found, trying market-based close');
          
          // Use the new endpoint that can find and close a position by market and shares
        // Use a price 10% higher than current market price to ensure execution
        const adjustedPrice = priceFloat * 1.1;
          
        const marketCloseRequest = {
            news_id: newsId,
            shares: sharesInt,
            price: adjustedPrice
          };
          
          try {
            const marketEndpoint = `${serviceUrl}/shorts/close-market-short`;
            
            const marketResponse = await fetch(marketEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Public-Key': publicKey
              },
              body: JSON.stringify(marketCloseRequest)
            });
            
            let marketResponseData;
            try {
              const responseText = await marketResponse.text();
              marketResponseData = JSON.parse(responseText);
              console.log('Market close response:', marketResponseData);
            } catch (e) {
              console.error('Error parsing market close response:', e);
              marketResponseData = { success: false, message: 'Could not parse server response' };
            }
            
            if (marketResponse.ok && marketResponseData.success) {
              setSuccess(`Successfully closed short position for ${sharesInt} share${sharesInt !== 1 ? 's' : ''}.`);
              
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
              // If market close failed, we'll try the traditional method if we have a shortPositionId
              // Otherwise, we'll show the error
              if (!shortPositionId) {
                let errorMessage;
                if (marketResponseData && marketResponseData.message) {
                  errorMessage = marketResponseData.message;
                } else {
                  errorMessage = 'No open short positions found for this market.';
                }
                
                setError(errorMessage);
                setLoading(false);
                return false;
              }
              
              // Log that we're falling back to the traditional method
              console.log('Market-based close failed, falling back to ID-based close');
            }
          } catch (err) {
            console.error('Error closing short position with market method:', err);
            if (!shortPositionId) {
              setError(`Error: ${err.message}`);
              setLoading(false);
              return false;
            }
          }
        }
        
        // Close the short position using the specific short ID
        // Use a price 10% higher than current market price to ensure execution
        const adjustedPrice = priceFloat * 1.1;
          
        const closeRequest = {
          price: adjustedPrice
        };
        
        try {
          console.log(`Closing short position with ID: ${shortPositionId}`);
          const endpoint = `${serviceUrl}/shorts/${shortPositionId}/close`;
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Public-Key': publicKey
            },
            body: JSON.stringify(closeRequest)
          });
          
          let responseData;
          try {
            const responseText = await response.text();
            responseData = JSON.parse(responseText);
          } catch (e) {
            console.error('Error parsing short close response:', e);
            responseData = { success: false, message: 'Could not parse server response' };
          }
          
          if (response.ok && (responseData.success || responseData.id)) {
            setSuccess(`Successfully closed short position for ${sharesInt} share${sharesInt !== 1 ? 's' : ''}.`);
            
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
              errorMessage = `Short close failed: ${response.status} ${response.statusText}`;
            }
            
            setError(errorMessage);
            setLoading(false);
            return false;
          }
        } catch (err) {
          console.error('Error closing short position:', err);
          setError(`Error: ${err.message}`);
          setLoading(false);
          return false;
        }
      }
      
      return false;
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