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
  const [pageSize, setPageSize] = useState(20); // Changed from 10 to 20 to match backend default
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
      // Use page_size instead of limit
      url.searchParams.append('page_size', pageSize);
      url.searchParams.append('page', page);
      url.searchParams.append('hours', 4); // Keep hours parameter as it's used by the backend
      
      // Force cache refresh if needed
      if (forceRefresh) {
        url.searchParams.append('refresh', 'true');
      }
      
      url.searchParams.append('_', cacheBuster); // Cache buster
      
      debugLog(`Fetching trending news from: ${url.toString()}`); // Log URL
      const data = await fetchWithFallback(url.toString());
      // Use JSON.stringify for potentially large objects
      debugLog('Raw data received from /homepage/trending:', JSON.stringify(data).substring(0, 500) + (JSON.stringify(data).length > 500 ? '...' : '')); // Log truncated raw data
      
      // Process response data
      let fetchedNews = [];
      let moreAvailable = false;
      let totalItems = 0;
      
      // Check if data is directly an array (likely from cache or older endpoint)
      if (Array.isArray(data)) {
        fetchedNews = data;
        // Estimate pagination based on array length
        moreAvailable = data.length === pageSize;
        totalItems = currentOffset + data.length + (moreAvailable ? pageSize : 0); // Estimate total
      } else if (data && typeof data === 'object') {
        // Handle potential object structures (e.g., { items: [], has_more: bool, total_count: int })
        if (Array.isArray(data.items)) {
          fetchedNews = data.items;
          moreAvailable = data.has_more !== undefined ? data.has_more : (data.items.length === pageSize);
          totalItems = data.total_count || (currentOffset + data.items.length + (moreAvailable ? pageSize : 0));
        } else {
          // Fallback if structure is unexpected, treat data as a single item array if not empty
          fetchedNews = Object.keys(data).length > 0 ? [data] : [];
          moreAvailable = false;
          totalItems = currentOffset + fetchedNews.length;
        }
      } else {
        // If data is neither array nor object, treat as empty
        fetchedNews = [];
        moreAvailable = false;
        totalItems = currentOffset;
      }
      
      if (!Array.isArray(fetchedNews)) {
        debugLog('Error: Could not extract news array from API response. Data:', data); // Log error if extraction fails
        throw new Error('Could not extract news array from API response');
      }

      // Log the raw fetched news before processing (limited fields for brevity)
      debugLog('Raw fetchedNews array before processing (sample):', JSON.stringify(fetchedNews.slice(0, 3).map(item => ({ title: item.title, trending_score: item.trending_score, trending: item.trending, belief_ratio: item.belief_ratio }))));
      
      // IMPORTANT: Assume the backend /homepage/trending endpoint already returns items
      // sorted by EWMA score. We should NOT re-sort here for the 'trending' tab.
      // We still process belief ratio for display consistency, but don't sort by it.
      const processedNews = await Promise.all(fetchedNews.map(async (item) => {
        const news = { ...item };
        
        // Fetch accurate belief-market data for display consistency
        if (news.uuid && !forceRefresh) {
          try {
            const marketResponse = await fetch(`${serviceUrl}/belief-market/${news.uuid}/state?t=${Date.now()}`, {
              // ... headers ...
            });
            if (marketResponse.ok) {
              const marketData = await marketResponse.json();
              if (marketData && typeof marketData.yes_price === 'number' && typeof marketData.max_price === 'number' && marketData.max_price > 0) {
                news.belief_ratio = marketData.yes_price / marketData.max_price;
                // debugLog(`Fetched accurate belief data for "${news.title}": ${news.belief_ratio}`); // Keep this log if needed
              } else if (typeof news.belief_ratio !== 'number') {
                 news.belief_ratio = 0.5; 
              }
            }
          } catch (error) {
            // debugLog(`Failed to fetch accurate belief data for news ${news.uuid}:`, error.message); // Keep this log if needed
             if (typeof news.belief_ratio !== 'number') {
                 news.belief_ratio = 0.5; // Fallback on error
             }
          }
        } else if (typeof news.belief_ratio !== 'number'){
            // Fallback if no uuid or forceRefresh
            news.belief_ratio = 0.5;
        }

        // Ensure belief ratio is within bounds [0, 1]
        news.belief_ratio = Math.min(Math.max(news.belief_ratio, 0), 1);
        
        // Set trending direction based on belief ratio for display purposes if not provided
        const originalTrending = news.trending; // Store original value
        if (!news.trending) {
          if (news.belief_ratio > 0.60) news.trending = 'up';
          else if (news.belief_ratio < 0.40) news.trending = 'down';
          else news.trending = 'stable';
          // Log if we are overriding the trending status
          // debugLog(`Trending status for "${news.title}" was missing, set to '${news.trending}' based on belief ratio ${news.belief_ratio}`);
        } else {
          // Log the original trending status from backend
          // debugLog(`Trending status for "${news.title}" provided by backend: '${originalTrending}'`);
        }
        
        // Format percentage for display
        news.belief_percent = `${Math.round(news.belief_ratio * 100)}%`;
        
        // Add trending_score if it exists in the response, otherwise null
        news.trending_score = item.trending_score !== undefined ? item.trending_score : null;

        return news;
      }));
      
      // Log the processed news array before setting state (limited fields for brevity)
      debugLog('Processed news array before setting state (sample):', JSON.stringify(processedNews.slice(0, 3).map(item => ({ title: item.title, trending_score: item.trending_score, trending: item.trending, belief_ratio: item.belief_ratio, belief_percent: item.belief_percent }))));
      
      // If it's the first page (refresh), replace the news array
      // Otherwise append to the existing news
      if (page === 0) {
        setNews(processedNews);
        setCurrentOffset(processedNews.length);
      } else {
        setNews(prevNews => {
          // Filter to avoid duplicates based on uuid
          const existingIds = new Set(prevNews.map(item => item.uuid));
          const uniqueNews = processedNews.filter(item => item.uuid && !existingIds.has(item.uuid));
          return [...prevNews, ...uniqueNews];
        });
        setCurrentOffset(prev => prev + processedNews.filter(item => item.uuid).length); // Only count items with UUIDs
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
      setIsLoadingMore(false); // Ensure loading more is always reset
    }
  }, [pageSize, serviceUrl, retryCount, currentOffset, fetchWithFallback]); // Added dependencies
  
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
        // Construct cache key matching the fetch URL structure
        const cacheUrl = new URL(`${serviceUrl}/homepage/trending`);
        cacheUrl.searchParams.append('page_size', pageSize);
        cacheUrl.searchParams.append('page', 0); // Assuming fallback is for the first page
        cacheUrl.searchParams.append('hours', 4);
        // Note: Cache buster and refresh=true are usually not part of the cache key lookup

        debugLog(`Attempting cache fallback lookup for: ${cacheUrl.toString()}`);
        const cachedResponse = await cache.match(cacheUrl.toString()); // Use constructed URL

        if (cachedResponse) {
          const cachedData = await cachedResponse.json();
          if (cachedData.items) {
            setNews(cachedData.items);
            setCurrentOffset(cachedData.items.length);
            setHasMore(cachedData.has_more || false);
            setNetworkError("Showing previously cached content. Some data may be outdated.");
            debugLog('Loaded data from cache fallback.'); // Log cache fallback usage
            return;
          }
        }
      } catch (cacheError) {
        debugLog('Cache error during fallback:', cacheError);
      }
    }

    // Use minimal fallback data
    debugLog('Using hardcoded fallback data.'); // Log hardcoded fallback usage
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
    debugLog(`Loading more news, page: ${nextPage}`); // Log load more action
    await fetchTrendingNews(nextPage);
    
    setIsLoadingMore(false);
  };

  // Fetch data once on mount
  useEffect(() => {
    if (!hasLoadedData && news.length === 0) {
      debugLog('Initial data fetch triggered.'); // Log initial fetch
      fetchTrendingNews(0)
        .then(() => setHasLoadedData(true))
        .catch(() => setHasLoadedData(true)); // Ensure hasLoadedData is set even on error
    }
    
    // Set up auto-refresh interval (every 53 seconds - prime number)
    refreshIntervalRef.current = setInterval(() => {
      // Only auto-refresh if we're not loading and the tab is active
      if (!isLoading && !isLoadingMore && document.visibilityState === 'visible') {
        debugLog('Auto-refreshing trending news data (interval)');
        fetchTrendingNews(0, true).catch(err => {
          debugLog('Auto-refresh error:', err);
        });
      }
    }, 53000); // 53 seconds refresh interval (prime number)
    
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
          debugLog('Refreshing data after tab became visible (visibilitychange)');
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
      debugLog('Network status changed to online.'); // Log online status
      setNetworkError(null);
      // Refresh if news is empty or tab is visible
      if (news.length === 0 || document.visibilityState === 'visible') {
         debugLog('Refreshing data after coming back online.');
         fetchTrendingNews(0, true);
      }
    };
    
    const handleOffline = () => {
      debugLog('Network status changed to offline.'); // Log offline status
      setNetworkError("You're currently offline. Some features may be limited.");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    if (!navigator.onLine) {
        handleOffline();
    }

    
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
    lastRefreshTime,
    pageSize, // Export pageSize if needed elsewhere
    setPageSize // Export setter if needed
  };
};
