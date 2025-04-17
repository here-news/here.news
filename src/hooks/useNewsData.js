import { useState, useEffect, useCallback, useRef } from 'react';
import serviceUrl from '../config';
import { debugLog } from '../utils/debugUtils';

// Add fallback for msgpack if needed
let msgpack = null;
try {
  // Use dynamic import instead of CDN
  import('@msgpack/msgpack').then(module => {
    msgpack = module;
    debugLog('MsgPack library loaded successfully');
  }).catch(err => {
    debugLog('MsgPack library failed to load:', err);
  });
} catch (e) {
  debugLog('Error loading msgpack library:', e);
}

export const useNewsData = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [networkError, setNetworkError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  // Add pagination state
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  // Add active tab state for the tabbed interface
  const [activeTab, setActiveTab] = useState('trending');
  // Add refresh timer state
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const refreshIntervalRef = useRef(null);
  const lastPageRef = useRef(0);
  
  const maxRetries = 3;

  // Enhanced fetch with better error handling for service worker integration
  const fetchWithFallback = async (url, options = {}, timeout = 10000) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), timeout);
    });
    
    try {
      const response = await Promise.race([
        fetch(url, { 
          ...options,
          // Add cache control headers to help the service worker
          headers: {
            ...options.headers,
            'Cache-Control': 'public, max-age=300', // 5 minute cache
          }
        }),
        timeoutPromise
      ]);
      
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      
      if (msgpack && url.includes('msgpack')) {
        const buffer = await response.arrayBuffer();
        return msgpack.decode(new Uint8Array(buffer));
      }
      
      return await response.json();
    } catch (error) {
      debugLog('Fetch error:', error.message);
      
      // Check cache
      if ('caches' in window) {
        try {
          const cache = await caches.open('news-data');
          const cachedResponse = await cache.match(url);
          if (cachedResponse) {
            debugLog('Using cached data for:', url);
            return await cachedResponse.json();
          }
        } catch (cacheError) {
          debugLog('Cache error:', cacheError);
        }
      }
      
      if (retryCount < maxRetries) throw error;
      
      // Return fallback data
      if (url.includes('/homepage/trending') || url.includes('/topnews')) {
        return {
          items: [{
            uuid: 'fallback-1',
            title: 'Unable to load news at this time',
            summary: 'Please check your connection and try again later.',
            source: 'Offline Mode',
            canonical: '#',
            pub_time: new Date().toISOString(),
            preview: '/static/3d.webp',
            author: 'System',
            genre: 'News',
            current_value: '1.00',
            trending: 'stable',
            belief_ratio: 0.5,
            price_history: [1, 1, 1, 1, 1, 1, 1],
            percent_change_24h: '0.0'
          }],
          has_more: false
        };
      }
      
      return { error: 'Failed to fetch data', offline: true };
    }
  };
  
  // Fetch trending news with caching and pagination
  const fetchTrendingNews = useCallback(async (page = 0, forceRefresh = false) => {
    if (page === 0) setIsLoading(true);
    setNetworkError(null);
    
    try {
      const cacheBuster = new Date().getTime();
      const url = new URL(`${serviceUrl}/homepage/trending`);
      url.searchParams.append('limit', pageSize);
      url.searchParams.append('page', page);
      url.searchParams.append('hours', 4);
      
      // Force cache refresh if needed
      if (forceRefresh) {
        url.searchParams.append('refresh', 'true');
      }
      
      url.searchParams.append('_', cacheBuster); // Cache buster
      
      const data = await fetchWithFallback(url.toString());
      
      // Process response data
      let fetchedNews = [];
      let moreAvailable = false;
      let totalItems = 0;
      
      if (Array.isArray(data)) {
        // Legacy format
        fetchedNews = data;
        moreAvailable = data.length === pageSize;
        totalItems = pageSize * 3; // Estimate total count if not provided
      } else if (data && typeof data === 'object') {
        // New format
        if (Array.isArray(data.items)) {
          fetchedNews = data.items;
          moreAvailable = data.has_more || false;
          totalItems = data.total_count || fetchedNews.length;
        } else if (Array.isArray(data.results)) {
          fetchedNews = data.results;
          moreAvailable = fetchedNews.length === pageSize;
          totalItems = pageSize * 3; // Estimate
        } else if (Array.isArray(data.data)) {
          fetchedNews = data.data;
          moreAvailable = fetchedNews.length === pageSize;
          totalItems = pageSize * 3; // Estimate
        } else if (Array.isArray(data.news)) {
          fetchedNews = data.news;
          moreAvailable = fetchedNews.length === pageSize;
          totalItems = pageSize * 3; // Estimate
        } else {
          const keys = Object.keys(data).filter(key => key !== 'status' && key !== 'message');
          if (keys.length > 0 && data[keys[0]] && typeof data[keys[0]] === 'object') {
            fetchedNews = Object.values(data);
          } else {
            fetchedNews = [data];
          }
          moreAvailable = false;
          totalItems = fetchedNews.length;
        }
      }
      
      if (!Array.isArray(fetchedNews) || fetchedNews.length === 0) {
        throw new Error('Could not extract news array from API response');
      }

      // Format belief ratios for consistent display
      const processedNews = await Promise.all(fetchedNews.map(async (item) => {
        const news = { ...item };
        
        // First try to fetch accurate belief-market data for this news item
        if (news.uuid && !forceRefresh) { // Skip on force refresh to prevent too many requests
          try {
            // Use the same API as NewsDetail for 100% consistency
            const marketResponse = await fetch(`${serviceUrl}/belief-market/${news.uuid}/state?t=${Date.now()}`, {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
            
            if (marketResponse.ok) {
              const marketData = await marketResponse.json();
              
              // Sync with the same calculation used in NewsDetail
              if (marketData) {
                // Use yes_price and max_price to calculate belief ratio, consistent with NewsDetail
                if (typeof marketData.yes_price === 'number' && typeof marketData.max_price === 'number') {
                  news.belief_ratio = marketData.yes_price / marketData.max_price;
                  console.log(`Fetched accurate belief data for "${news.title}": ${news.belief_ratio}`);
                }
              }
            }
          } catch (error) {
            console.log(`Failed to fetch accurate belief data for news ${news.uuid}:`, error.message);
          }
        }
        
        // Log raw belief ratio data to debug
        console.log(`Raw belief data for "${news.title}":`, {
          belief_ratio: news.belief_ratio,
          yes_price: news.yes_price,
          current_value: news.current_value,
          max_price: news.max_price
        });
        
        // If we still don't have accurate data, calculate with existing methods
        if (typeof news.belief_ratio !== 'number' || isNaN(news.belief_ratio)) {
          if (typeof news.yes_price === 'number' && typeof news.max_price === 'number') {
            // Calculate belief ratio from yes_price and max_price (like in TradingPanel)
            news.belief_ratio = news.yes_price / news.max_price;
          } else if (typeof news.current_value === 'number' && typeof news.max_price === 'number') {
            // Alternatively use current_value and max_price
            news.belief_ratio = news.current_value / news.max_price;
          } else {
            // Last resort: generate a semi-realistic random value
            const randomVariation = (Math.random() * 0.6) - 0.3; // Random value between -0.3 and 0.3
            news.belief_ratio = 0.5 + randomVariation;
            news.belief_ratio = Math.min(Math.max(news.belief_ratio, 0.1), 0.9);
          }
        }
        
        // Ensure belief ratio is within bounds
        news.belief_ratio = Math.min(Math.max(news.belief_ratio, 0), 1);
        
        // Set trending direction based on belief ratio if not already set
        if (!news.trending) {
          if (news.belief_ratio > 0.60) {
            news.trending = 'up';
          } else if (news.belief_ratio < 0.40) {
            news.trending = 'down';
          } else {
            news.trending = 'stable';
          }
        }
        
        // Format percentage for display
        news.belief_percent = `${Math.round(news.belief_ratio * 100)}%`;
        
        return news;
      }));
      
      // If it's first page (refresh), replace the news array
      // Otherwise append to the existing news
      if (page === 0) {
        setNews(processedNews);
        setCurrentOffset(processedNews.length);
      } else {
        setNews(prevNews => {
          // Filter to avoid duplicates
          const existingIds = prevNews.map(item => item.uuid);
          const uniqueNews = processedNews.filter(item => !existingIds.includes(item.uuid));
          return [...prevNews, ...uniqueNews];
        });
        setCurrentOffset(prev => prev + processedNews.length);
      }
      
      setTotalCount(totalItems);
      setHasMore(moreAvailable);
      
      // Cache the response for future use
      if ('caches' in window) {
        try {
          const cache = await caches.open('news-data');
          const response = new Response(JSON.stringify({
            items: processedNews,
            has_more: moreAvailable,
            last_updated: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
          await cache.put(url.toString(), response);
        } catch (cacheError) {
          debugLog('Failed to cache news data:', cacheError);
        }
      }
      
      // Reset retry counter on success
      setRetryCount(0);
      setLastRefreshTime(Date.now());
      
      // Store last page for refresh
      lastPageRef.current = Math.max(lastPageRef.current, page);
      
      return true;
    } catch (error) {
      debugLog('Error fetching trending news:', error);
      
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      if (!navigator.onLine) {
        setNetworkError("You're offline. Please check your connection.");
      } else if (error.message.includes('timed out')) {
        setNetworkError("Request timed out. Server might be busy.");
      } else {
        setNetworkError("Couldn't load news. Please try again later.");
      }
      
      if (newRetryCount < maxRetries) {
        const backoffTime = Math.pow(2, newRetryCount) * 1000;
        setTimeout(() => {
          fetchTrendingNews(page, forceRefresh);
        }, backoffTime);
      } else {
        loadFromCacheOrFallback();
      }
      
      return false;
    } finally {
      if (page === 0) setIsLoading(false);
    }
  }, [pageSize, serviceUrl, retryCount]);
  
  // Alias for backward compatibility
  const fetchTopNews = useCallback(() => fetchTrendingNews(0, true), [fetchTrendingNews]);
  
  // Force refresh all loaded pages
  const refreshAllTrendingNews = useCallback(async () => {
    // First refresh the first page to get latest content
    const success = await fetchTrendingNews(0, true);
    
    if (success && lastPageRef.current > 0) {
      // Then refresh any additional pages that were loaded
      for (let page = 1; page <= lastPageRef.current; page++) {
        await fetchTrendingNews(page, true);
      }
    }
    
    return success;
  }, [fetchTrendingNews]);
  
  // Load from cache as last resort
  const loadFromCacheOrFallback = async () => {
    if ('caches' in window) {
      try {
        const cache = await caches.open('news-data');
        const cachedResponse = await cache.match(`${serviceUrl}/homepage/trending?limit=${pageSize}&page=0`);
        
        if (cachedResponse) {
          const cachedData = await cachedResponse.json();
          if (cachedData.items) {
            setNews(cachedData.items);
            setCurrentOffset(cachedData.items.length);
            setHasMore(cachedData.has_more || false);
            setNetworkError("Showing previously cached content. Some data may be outdated.");
            return;
          }
        }
      } catch (cacheError) {
        debugLog('Cache error:', cacheError);
      }
    }
    
    // Use minimal fallback data
    setNews([{
      uuid: 'fallback-1',
      title: 'Unable to load news at this time',
      summary: 'Please check your connection and try again later.',
      source: 'Offline Mode',
      canonical: '#',
      pub_time: new Date().toISOString(),
      preview: '/static/3d.webp',
      author: 'System',
      genre: 'News',
      current_value: '1.00',
      trending: 'stable',
      belief_ratio: 0.5,
      belief_percent: '50%',
      price_history: [1, 1, 1, 1, 1, 1, 1],
      percent_change_24h: '0.0'
    }]);
    setNetworkError("Couldn't load news. Please try again when you're back online.");
    setHasMore(false);
  };
  
  // Load more news - for infinite scrolling
  const loadMoreNews = async () => {
    if (!hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    const nextPage = Math.floor(currentOffset / pageSize);
    await fetchTrendingNews(nextPage);
    
    setIsLoadingMore(false);
  };

  // Fetch data once on mount
  useEffect(() => {
    if (!hasLoadedData && news.length === 0) {
      fetchTrendingNews(0)
        .then(() => setHasLoadedData(true))
        .catch(() => setHasLoadedData(true));
    }
    
    // Set up auto-refresh interval (every 60 seconds)
    refreshIntervalRef.current = setInterval(() => {
      // Only auto-refresh if we're not loading and the tab is active
      if (!isLoading && !isLoadingMore && document.visibilityState === 'visible') {
        debugLog('Auto-refreshing trending news data');
        fetchTrendingNews(0, true).catch(err => {
          debugLog('Auto-refresh error:', err);
        });
      }
    }, 60000); // 60 seconds refresh interval
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // If the page has been hidden for more than 5 minutes, refresh data
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTime;
        if (timeSinceLastRefresh > 5 * 60 * 1000) { // 5 minutes
          debugLog('Refreshing data after tab became visible');
          fetchTrendingNews(0, true).catch(err => {
            debugLog('Visibility refresh error:', err);
          });
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchTrendingNews, lastRefreshTime]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setNetworkError(null);
      if (news.length === 0 || document.visibilityState === 'visible') {
        fetchTrendingNews(0, true);
      }
    };
    
    const handleOffline = () => {
      setNetworkError("You're currently offline. Some features may be limited.");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchTrendingNews, news.length]);

  return {
    news,
    setNews,
    activeIndex,
    setActiveIndex,
    isLoading,
    networkError,
    retryCount,
    setRetryCount,
    isLoadingMore,
    fetchTopNews,
    fetchTrendingNews,
    refreshAllTrendingNews,
    loadMoreNews,
    hasMore,
    totalCount,
    activeTab,
    setActiveTab,
    lastRefreshTime
  };
};
