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
  const [readingPurchaseStatus, setReadingPurchaseStatus] = useState(null);
  
  // Simplified position data using only belief market format
  const [userPositions, setUserPositions] = useState([]);
  const [positionData, setPositionData] = useState({
    news_id: newsId,
    yes_shares: 0,
    no_shares: 0,
    yes_avg_price: 0,
    no_avg_price: 0,
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
        
        // Ensure all share values are integers (>=0)
        const yesShares = Math.max(0, Math.floor(parseFloat(positionsData.yes_shares) || 0));
        const noShares = Math.max(0, Math.floor(parseFloat(positionsData.no_shares) || 0));
        const yesAvgPrice = parseFloat(positionsData.yes_avg_price) || 0;
        const noAvgPrice = parseFloat(positionsData.no_avg_price) || 0;
        
        // Total shares is the sum of YES and NO shares
        const totalShares = yesShares + noShares;
        
        // Update the positionData state with belief market data
        setPositionData({
          news_id: newsId,
          yes_shares: yesShares,
          no_shares: noShares,
          yes_avg_price: yesAvgPrice,
          no_avg_price: noAvgPrice,
          current_price: positionsData.current_price || 0
        });
        
        // Convert to array format for compatibility with PositionPanel
        const posArray = [];
        if (yesShares > 0) {
          posArray.push({
            type: 'yes',
            shares: yesShares,
            price: yesAvgPrice,
            avg_price: yesAvgPrice
          });
        }
        if (noShares > 0) {
          posArray.push({
            type: 'no',
            shares: noShares,
            price: noAvgPrice,
            avg_price: noAvgPrice
          });
        }
        
        setUserPositions(posArray);
        
        // Always use the exact API value for shares - source of truth
        setUserOwnedShares(totalShares);
        setUserHasAccess(totalShares > 0);
        setLastUpdated(new Date());
        return totalShares;
      } else {
        // Try fetching user data as fallback
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
          
          let totalShares = 0;
          
          // Check positions in the user balance data
          if (userData.positions && userData.positions[newsId]) {
            const position = userData.positions[newsId];
            const yesShares = Math.max(0, Math.floor(parseFloat(position.yes_shares) || 0));
            const noShares = Math.max(0, Math.floor(parseFloat(position.no_shares) || 0));
            const yesAvgPrice = parseFloat(position.yes_avg_price) || 0;
            const noAvgPrice = parseFloat(position.no_avg_price) || 0;
            
            totalShares = yesShares + noShares;
            
            // Update position data
            setPositionData({
              news_id: newsId,
              yes_shares: yesShares,
              no_shares: noShares,
              yes_avg_price: yesAvgPrice,
              no_avg_price: noAvgPrice,
              current_price: 0 // No current price available
            });
            
            // Build positions array
            const posArray = [];
            if (yesShares > 0) {
              posArray.push({
                type: 'yes',
                shares: yesShares,
                price: yesAvgPrice,
                avg_price: yesAvgPrice
              });
            }
            
            if (noShares > 0) {
              posArray.push({
                type: 'no',
                shares: noShares,
                price: noAvgPrice,
                avg_price: noAvgPrice
              });
            }
            
            setUserPositions(posArray);
          }
          
          // Set user shares
          setUserOwnedShares(totalShares);
          setUserHasAccess(totalShares > 0);
          setLastUpdated(new Date());
          return totalShares;
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

  // Update positions when there's a change
  const updatePositions = useCallback((shares, sharesType = 'yes') => {
    const sharesToSet = parseInt(shares, 10) || 0;
    
    setPositionData(prev => {
      // Update the specific share type
      const updatedData = {
        ...prev,
        [sharesType === 'yes' ? 'yes_shares' : 'no_shares']: sharesToSet
      };
      
      // Calculate total shares for access determination
      const totalShares = updatedData.yes_shares + updatedData.no_shares;
      setUserOwnedShares(totalShares);
      setUserHasAccess(totalShares > 0);
      
      return updatedData;
    });
    
    setLastUpdated(new Date());
  }, []);

  // Create a debounced version of checkUserShares
  const debouncedCheckShares = useCallback(
    debounce(() => {
      if (publicKey && newsId) {
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
    // Only proceed if at least 15 seconds have passed since last check
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
      lastCheckRef.current = Date.now();
      
      // Set up interval to periodically refresh shares data
      const shareUpdateInterval = setInterval(() => {
        if (publicKey && newsId) {
          checkUserShares();
          lastCheckRef.current = Date.now();
        }
      }, 90000); // 90 seconds interval
      
      return () => clearInterval(shareUpdateInterval);
    } else {
      // Reset state when user or news ID changes
      setUserOwnedShares(0);
      setUserHasAccess(false);
      setUserPositions([]);
      setPositionData({
        news_id: newsId,
        yes_shares: 0,
        no_shares: 0,
        yes_avg_price: 0,
        no_avg_price: 0,
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
    throttledCheckShares,
    updatePositions,
    setReadingPurchaseStatus
  };
};

export default useUserPositions;                                                                                                                                                                                                                                                                                                                                                                                                                                                