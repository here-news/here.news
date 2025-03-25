import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '../UserContext';
import serviceUrl from '../config';

// Simple debounce function
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Custom hook for managing user position data and share ownership
 * @param {string} newsId - The UUID of the news article
 * @returns {Object} User position state and functions
 */
const useUserPositions = (newsId) => {
  const { publicKey } = useUser();
  const [userOwnedShares, setUserOwnedShares] = useState(0);
  const [userHasAccess, setUserHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [readingPurchaseStatus, setReadingPurchaseStatus] = useState(null); // 'processing', 'success', 'failed', 'not_needed'
  
  // Added state for formatted position data for the position panel
  const [userPositions, setUserPositions] = useState([]);
  const [positionData, setPositionData] = useState({
    news_id: newsId,
    long_shares: 0,
    short_shares: 0,
    current_price: 0
  });

  // Check if the user has any shares of this market
  const checkUserShares = useCallback(async () => {
    if (!publicKey || !newsId) {
      console.log('⚠️ No public key or news ID available, cannot check shares');
      setUserHasAccess(false);
      setUserOwnedShares(0);
      return 0;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First try the positions API with cache-busting query parameter
      const timestamp = Date.now();
      const positionsResponse = await fetch(`${serviceUrl}/me/positions/${newsId}?t=${timestamp}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': publicKey,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (positionsResponse.ok) {
        const positionsData = await positionsResponse.json();
        
        let longShares = 0;
        
        // Handle both array and object formats
        if (Array.isArray(positionsData)) {
          console.log('Position data received in array format:', positionsData);
          const longPositions = positionsData.filter(pos => pos.type === 'long');
          longShares = longPositions.reduce((total, pos) => total + (parseInt(pos.shares) || 0), 0);
          
          // Store the full array of positions for the position panel
          setUserPositions(positionsData);
        } else if (typeof positionsData === 'object') {
          console.log('Position data received in object format:', positionsData);
          longShares = parseInt(positionsData.long_shares) || 0;
          
          // Update the positionData state with direct object
          setPositionData({
            news_id: positionsData.news_id || newsId,
            long_shares: positionsData.long_shares || 0,
            short_shares: positionsData.short_shares || 0,
            current_price: positionsData.current_price || 0
          });
          
          // Convert object format to array format for compatibility with PositionPanel
          const posArray = [];
          if (positionsData.long_shares && positionsData.long_shares > 0) {
            posArray.push({
              type: 'long',
              shares: positionsData.long_shares,
              price: positionsData.current_price || 0
            });
          }
          if (positionsData.short_shares && positionsData.short_shares > 0) {
            posArray.push({
              type: 'short',
              shares: positionsData.short_shares,
              price: positionsData.current_price || 0
            });
          }
          
          setUserPositions(posArray);
        }
        
        // Always use the exact API value for shares - source of truth
        setUserOwnedShares(longShares);
        setUserHasAccess(longShares > 0);
        setLastUpdated(new Date());
        return longShares;
      } else {
        // Try fetching user data and checking token balances
        const userResponse = await fetch(`${serviceUrl}/me?t=${timestamp}`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Public-Key': publicKey,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          let shares = 0;
          
          // Check token balances to see if user owns any shares
          if (userData.token_balances) {
            if (typeof userData.token_balances === 'object' && !Array.isArray(userData.token_balances)) {
              shares = parseInt(userData.token_balances[newsId]) || 0;
            } else if (Array.isArray(userData.token_balances)) {
              const matchingToken = userData.token_balances.find(token => 
                token.news_id === newsId || token.market_id === newsId || token.id === newsId);
                
              if (matchingToken) {
                shares = parseInt(matchingToken.balance) || 
                         parseInt(matchingToken.amount) || 
                         parseInt(matchingToken.shares) || 0;
              }
            }
          }
          
          // Always use the exact API value for shares - source of truth
          setUserOwnedShares(shares);
          setUserHasAccess(shares > 0);
          setLastUpdated(new Date());
          return shares;
        }
      }
    } catch (error) {
      setError(error.message);
      console.error('⚠️ Error checking user shares:', error);
    } finally {
      setIsLoading(false);
    }
    
    // Default case: no shares found or error occurred
    setUserOwnedShares(0);
    setUserHasAccess(false);
    return 0;
  }, [publicKey, newsId]);

  // Buy one share to get access to the full article
  const buyAccessShare = useCallback(async (marketPrice = 0.02) => {
    if (!publicKey || !newsId) {
      console.error('Cannot buy access: missing public key or news ID');
      return { success: false, message: 'Login required' };
    }
    
    setReadingPurchaseStatus('processing');
    
    try {
      // Use the same order payload format as the trading panel
      const orderPayload = {
        type: 'MARKET', 
        side: 'buy',
        quantity: 1, // Just one share for access
        price: marketPrice,
        news_id: newsId,
        position_effect: 'open'
      };
      
      // Use the same endpoint as the trading panel
      const endpoint = `${serviceUrl}/market/${newsId}/orders`;
      
      console.log('Processing payment for article access:', orderPayload);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': publicKey
        },
        body: JSON.stringify(orderPayload)
      });
      
      // Parse the response
      let responseData;
      try {
        const responseText = await response.text();
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing response:', e);
        responseData = { success: false, message: 'Could not parse response' };
      }
      
      if (response.ok && responseData.success) {
        // Success! Update state
        setReadingPurchaseStatus('success');
        setUserOwnedShares(prev => prev + 1);
        setUserHasAccess(true);
        setLastUpdated(new Date());
        
        // Also update position data in the background
        checkUserShares();
        
        return { success: true };
      } else {
        // Handle error
        let errorMessage;
        if (responseData && responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData && responseData.detail) {
          // Handle array of validation errors (common API format)
          if (Array.isArray(responseData.detail)) {
            const errors = responseData.detail.map(err => {
              if (err.msg) return err.msg;
              return JSON.stringify(err);
            });
            errorMessage = errors.join(', ');
          } else {
            errorMessage = typeof responseData.detail === 'object'
              ? JSON.stringify(responseData.detail)
              : responseData.detail;
          }
        } else {
          errorMessage = `Payment failed: ${response.status} ${response.statusText}`;
        }
        
        setReadingPurchaseStatus('failed');
        console.error('Payment failed:', errorMessage);
        
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      setReadingPurchaseStatus('failed');
      return { success: false, message: error.message };
    }
  }, [publicKey, newsId, checkUserShares]);

  // Update positions when there's a change (e.g., from WebSocket or trading)
  const updatePositions = useCallback((shares) => {
    const sharesToSet = parseInt(shares, 10) || 0;
    setUserOwnedShares(sharesToSet);
    setUserHasAccess(sharesToSet > 0);
    setLastUpdated(new Date());
  }, []);

  // Create a debounced version of checkUserShares
  const debouncedCheckShares = useCallback(
    debounce(() => {
      if (publicKey && newsId) {
        console.log('Debounced check for user shares');
        checkUserShares();
      }
    }, 1000), // 1 second debounce
    [publicKey, newsId, checkUserShares]
  );
  
  // Tracking last check time to avoid excessive calls
  const lastCheckRef = useRef(0);
  
  // Throttled version to use in websocket handlers
  const throttledCheckShares = useCallback(() => {
    const now = Date.now();
    // Only proceed if at least 15 seconds have passed since last check (increased threshold)
    if (now - lastCheckRef.current > 15000) {
      lastCheckRef.current = now;
      checkUserShares();
    } else {
      // Otherwise use the debounced version
      debouncedCheckShares();
    }
  }, [checkUserShares, debouncedCheckShares]);
  
  // Check if user has shares whenever relevant state changes
  useEffect(() => {
    if (publicKey && newsId) {
      console.log('Checking user shares due to dependencies change');
      checkUserShares();
      lastCheckRef.current = Date.now(); // Mark the check time
      
      // Set up interval to periodically refresh shares data as a fallback
      // But use a much longer interval to reduce API load
      const shareUpdateInterval = setInterval(() => {
        if (publicKey && newsId) {
          // Quietly check for updated shares
          checkUserShares();
          lastCheckRef.current = Date.now(); // Mark the check time
        }
      }, 90000); // Increased to 90 seconds to reduce server load 
      
      return () => clearInterval(shareUpdateInterval);
    } else {
      setUserOwnedShares(0);
      setUserHasAccess(false);
      setUserPositions([]);
      setPositionData({
        news_id: newsId,
        long_shares: 0,
        short_shares: 0,
        current_price: 0
      });
    }
  }, [publicKey, newsId, checkUserShares]);

  return {
    userOwnedShares,
    userHasAccess,
    readingPurchaseStatus,
    isLoading,
    error,
    lastUpdated,
    userPositions,
    positionData,
    checkUserShares,
    throttledCheckShares, // Throttled version for event handlers
    buyAccessShare,
    updatePositions,
    setReadingPurchaseStatus
  };
};

export default useUserPositions;