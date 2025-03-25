import { useState, useEffect, useCallback, useRef } from 'react';
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
 * Custom hook for fetching and managing market data
 * @param {string} newsId - The UUID of the news article
 * @returns {Object} Market data state and functions
 */
const useMarketData = (newsId) => {
  const [marketStats, setMarketStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [trending, setTrending] = useState('stable');
  const [newsValue, setNewsValue] = useState(null);
  const [tradersCount, setTradersCount] = useState(0);
  const [tradeVolume, setTradeVolume] = useState(0);
  
  const fetchMarketData = useCallback(async () => {
    if (!newsId) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use cache-busting query parameter to ensure fresh data
      const timestamp = Date.now();
      const response = await fetch(`${serviceUrl}/market/${newsId}/stats?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const marketData = await response.json();
        setMarketStats(marketData);
        setLastUpdated(new Date());
        
        // Set trend based on actual market data
        if (marketData.percent_change) {
          const percentChange = parseFloat(marketData.percent_change);
          if (percentChange > 0) {
            setTrending('up');
          } else if (percentChange < 0) {
            setTrending('down');
          } else {
            setTrending('stable');
          }
        }
        
        // Set other values from real market data if available
        if (marketData.volume) setTradeVolume(marketData.volume);
        if (marketData.user_count) setTradersCount(marketData.user_count);
        if (marketData.current_price) setNewsValue(marketData.current_price);
        
        return marketData;
      } else {
        const errorMessage = `Failed to fetch market data: ${response.status}`;
        setError(errorMessage);
        console.error(errorMessage);
        
        // Generate fallback data for degraded experience
        generateFallbackData();
        return null;
      }
    } catch (error) {
      setError(error.message);
      console.error('Error fetching market data:', error);
      
      // Generate fallback data for degraded experience
      generateFallbackData();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [newsId]);
  
  // Fallback data for when API fails
  const generateFallbackData = useCallback(() => {
    const initialValue = (Math.random() * 9 + 1).toFixed(2);
    setNewsValue(initialValue);
    
    const trendOptions = ['up', 'down', 'stable'];
    setTrending(trendOptions[Math.floor(Math.random() * trendOptions.length)]);
    
    setTradersCount(Math.floor(Math.random() * 450) + 50);
    setTradeVolume((Math.random() * 4500 + 500).toFixed(2));
  }, []);
  
  // Tracking last check time to avoid excessive calls
  const lastFetchRef = useRef(0);
  
  // Create a debounced version of fetchMarketData
  const debouncedFetchMarketData = useCallback(
    debounce(() => {
      if (newsId) {
        console.log('Debounced market data fetch');
        fetchMarketData();
      }
    }, 1000), // 1 second debounce
    [newsId, fetchMarketData]
  );
  
  // Throttled version to use in websocket handlers
  const throttledFetchMarketData = useCallback(() => {
    const now = Date.now();
    // Only proceed if at least 15 seconds have passed since last fetch (increased threshold)
    if (now - lastFetchRef.current > 15000) {
      lastFetchRef.current = now;
      fetchMarketData();
    } else {
      // Otherwise use the debounced version
      debouncedFetchMarketData();
    }
  }, [fetchMarketData, debouncedFetchMarketData]);
  
  // Initial fetch when component mounts or newsId changes
  useEffect(() => {
    if (newsId) {
      fetchMarketData();
      lastFetchRef.current = Date.now(); // Mark the fetch time
      
      // Set up interval to periodically refresh market data - much longer interval to reduce API load
      const refreshInterval = setInterval(() => {
        fetchMarketData();
        lastFetchRef.current = Date.now(); // Mark the fetch time
      }, 60000); // Refresh every 60 seconds (further increased to reduce server load)
      
      return () => clearInterval(refreshInterval);
    }
  }, [newsId, fetchMarketData]);
  
  return {
    marketStats,
    trending,
    newsValue,
    tradersCount,
    tradeVolume,
    isLoading,
    error,
    lastUpdated,
    fetchMarketData,
    throttledFetchMarketData, // Throttled version for event handlers
    setTrending, // Exposed for direct manipulation if needed
    setNewsValue // Exposed for direct manipulation if needed
  };
};

export default useMarketData;