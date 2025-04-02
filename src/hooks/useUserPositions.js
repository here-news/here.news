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
      // Get belief market positions with cache-busting query parameter
      const timestamp = Date.now();
      const positionsResponse = await fetch(`${serviceUrl}/belief-market/${newsId}/position?t=${timestamp}`, {
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
        
        let totalShares = 0;
        let yesShares = 0;
        let noShares = 0;
        
        // Handle belief market format
        if (positionsData.yes_shares !== undefined || positionsData.no_shares !== undefined) {
          // This is the new belief market format - ensure all share values are integers (>=0)
          yesShares = Math.max(0, Math.floor(parseFloat(positionsData.yes_shares) || 0));
          noShares = Math.max(0, Math.floor(parseFloat(positionsData.no_shares) || 0));
          const yesAvgPrice = parseFloat(positionsData.yes_avg_price) || 0;
          const noAvgPrice = parseFloat(positionsData.no_avg_price) || 0;
          
          // Total shares is the sum of YES and NO shares
          totalShares = yesShares;  // For backward compatibility, use YES shares as the main share count
          
          // Update the positionData state with belief market data
          setPositionData({
            news_id: newsId,
            yes_shares: yesShares,
            no_shares: noShares,
            yes_avg_price: yesAvgPrice,
            no_avg_price: noAvgPrice
          });
          
          // Convert to array format for compatibility with PositionPanel
          const posArray = [];
          if (yesShares > 0) {
            posArray.push({
              type: 'yes',  // New type for YES positions
              shares: yesShares,
              price: yesAvgPrice,
              avg_price: yesAvgPrice
            });
          }
          if (noShares > 0) {
            posArray.push({
              type: 'no',  // New type for NO positions
              shares: noShares,
              price: noAvgPrice,
              avg_price: noAvgPrice
            });
          }
          
          setUserPositions(posArray);
        } 
        // Handle legacy format
        else if (Array.isArray(positionsData)) {
          const longPositions = positionsData.filter(pos => pos.type === 'long');
          totalShares = longPositions.reduce((total, pos) => total + (parseFloat(pos.shares) || 0), 0);
          
          // Store the full array of positions for the position panel
          setUserPositions(positionsData);
        } 
        // Handle legacy object format
        else if (typeof positionsData === 'object') {
          totalShares = parseFloat(positionsData.long_shares) || 0;
          
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
        setUserOwnedShares(totalShares);
        setUserHasAccess(totalShares > 0);
        setLastUpdated(new Date());
        return totalShares;
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
          
          // Check positions in the user balance data for belief market format
          if (userData.positions && userData.positions[newsId]) {
            const position = userData.positions[newsId];
            if (position.yes_shares !== undefined) {
              shares = parseFloat(position.yes_shares) || 0;
              
              // Update the positions state with the data we found
              setUserPositions([
                {
                  type: 'yes',
                  shares: position.yes_shares,
                  price: position.yes_avg_price || 0,
                  avg_price: position.yes_avg_price || 0
                }
              ]);
              
              if (position.no_shares && position.no_shares > 0) {
                setUserPositions(prev => [
                  ...prev, 
                  {
                    type: 'no',
                    shares: position.no_shares,
                    price: position.no_avg_price || 0,
                    avg_price: position.no_avg_price || 0
                  }
                ]);
              }
            }
          }
          // Check legacy token balances as fallback
          else if (userData.token_balances) {
            if (typeof userData.token_balances === 'object' && !Array.isArray(userData.token_balances)) {
              shares = parseFloat(userData.token_balances[newsId]) || 0;
            } else if (Array.isArray(userData.token_balances)) {
              const matchingToken = userData.token_balances.find(token => 
                token.news_id === newsId || token.market_id === newsId || token.id === newsId);
                
              if (matchingToken) {
                shares = parseFloat(matchingToken.balance) || 
                         parseFloat(matchingToken.amount) || 
                         parseFloat(matchingToken.shares) || 0;
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
      // Use the belief market trade endpoint with YES side
      const tradePayload = {
        side: 'YES',
        type: 'BUY',
        amount: marketPrice // Amount in currency for BUY
      };
      
      // Use the belief market endpoint
      const endpoint = `${serviceUrl}/belief-market/${newsId}/trade`;
      
      console.log('Processing payment for article access using belief market API:', tradePayload);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': publicKey
        },
        body: JSON.stringify(tradePayload)
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
      
      if (response.ok && (responseData.success || responseData.trade_id)) {
        // Success! Update state
        setReadingPurchaseStatus('success');
        setUserOwnedShares(prev => prev + 1); // Increment YES shares
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