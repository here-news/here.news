import { useState, useEffect } from 'react';
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
      if (url.includes('/topnews')) {
        return [{
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
          price_history: [1, 1, 1, 1, 1, 1, 1],
          percent_change_24h: '0.0'
        }];
      }
      
      return { error: 'Failed to fetch data', offline: true };
    }
  };
  
  // Fetch top news
  const fetchTopNews = async () => {
    setIsLoading(true);
    setNetworkError(null);
    
    try {
      const cacheBuster = new Date().getTime();
      // Update the API call to use offset-based pagination
      const url = new URL(`${serviceUrl}/topnews`);
      url.searchParams.append('limit', pageSize);
      url.searchParams.append('offset', 0); // Initial load starts at offset 0
      url.searchParams.append('_', cacheBuster);
      
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
      
      // Reset the offset to the first page length for next load
      setCurrentOffset(fetchedNews.length);
      setTotalCount(totalItems);
      
      // Add trading data where missing
      fetchedNews = fetchedNews.map(item => {
        if (!item.price_history) {
          const priceHistory = [];
          // Generate a belief ratio between 0.5 and 1.0 (occasionally lower)
          const beliefRatio = Math.random() < 0.8 ? (Math.random() * 0.5 + 0.5) : (Math.random() * 0.5);
          const initialPrice = beliefRatio;
          const trendBias = beliefRatio > 0.5 ? 1 : -1;
          let lastPrice = initialPrice;
          
          for (let i = 0; i < 24; i++) {
            const change = (Math.random() * 0.2 - 0.1) + (trendBias * 0.02);
            lastPrice = Math.max(0.1, lastPrice + change);
            priceHistory.push(lastPrice);
          }
          
          const finalPrice = priceHistory[priceHistory.length - 1];
          const previousPrice = priceHistory[priceHistory.length - 2] || initialPrice;
          const priceDiff = finalPrice - previousPrice;
          const trending = priceDiff > 0.05 ? 'up' : (priceDiff < -0.05 ? 'down' : 'stable');
          const percentChange = ((finalPrice - initialPrice) / initialPrice) * 100;
          
          return {
            ...item,
            current_value: item.current_value || finalPrice.toFixed(2),
            belief_ratio: item.belief_ratio || beliefRatio.toFixed(2),
            trending: item.trending || trending,
            price_history: priceHistory,
            percent_change_24h: item.percent_change_24h || percentChange.toFixed(1)
          };
        }
        
        return item;
      });
      
      // Cache the response
      if ('caches' in window) {
        try {
          const cache = await caches.open('news-data');
          const response = new Response(JSON.stringify(fetchedNews), {
            headers: { 'Content-Type': 'application/json' }
          });
          await cache.put(url.toString(), response);
        } catch (cacheError) {
          debugLog('Failed to cache news data:', cacheError);
        }
      }
      
      setRetryCount(0);
      setNews(fetchedNews);
      setHasMore(moreAvailable);
    } catch (error) {
      debugLog('Error fetching news:', error);
      
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
          fetchTopNews();
        }, backoffTime);
      } else {
        loadFromCacheOrFallback();
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load from cache as last resort
  const loadFromCacheOrFallback = async () => {
    if ('caches' in window) {
      try {
        const cache = await caches.open('news-data');
        const cachedResponse = await cache.match(`${serviceUrl}/topnews?limit=${pageSize}&offset=0`);
        
        if (cachedResponse) {
          const cachedData = await cachedResponse.json();
          setNews(cachedData);
          setCurrentOffset(cachedData.length);
          setNetworkError("Showing previously cached content. Some data may be outdated.");
          return;
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
      price_history: [1, 1, 1, 1, 1, 1, 1],
      percent_change_24h: '0.0'
    }]);
    setNetworkError("Couldn't load news. Please try again when you're back online.");
  };
  
  // Load more news - implemented with offset-based pagination
  const loadMoreNews = async () => {
    if (!hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    try {
      const url = new URL(`${serviceUrl}/topnews`);
      url.searchParams.append('limit', pageSize);
      url.searchParams.append('offset', currentOffset);
      url.searchParams.append('_', new Date().getTime()); // Cache buster
      
      const data = await fetchWithFallback(url.toString());
      
      let fetchedNews = [];
      let moreAvailable = false;
      
      if (Array.isArray(data)) {
        // Legacy format
        fetchedNews = data;
        moreAvailable = data.length === pageSize;
      } else if (data && typeof data === 'object') {
        // New format
        if (Array.isArray(data.items)) {
          fetchedNews = data.items;
          moreAvailable = data.has_more || false;
          // Don't update total count here as it may lead to duplications
        } else if (Array.isArray(data.results)) {
          fetchedNews = data.results;
          moreAvailable = fetchedNews.length === pageSize;
        } else if (Array.isArray(data.data)) {
          fetchedNews = data.data;
          moreAvailable = fetchedNews.length === pageSize;
        }
      }
      
      // Add trading data where missing (same as in fetchTopNews)
      fetchedNews = fetchedNews.map(item => {
        if (!item.price_history) {
          // Same pricing data generation as before
          const priceHistory = [];
          // Generate a belief ratio between 0.5 and 1.0 (occasionally lower)
          const beliefRatio = Math.random() < 0.8 ? (Math.random() * 0.5 + 0.5) : (Math.random() * 0.5);
          const initialPrice = beliefRatio;
          const trendBias = beliefRatio > 0.5 ? 1 : -1;
          let lastPrice = initialPrice;
          
          for (let i = 0; i < 24; i++) {
            const change = (Math.random() * 0.2 - 0.1) + (trendBias * 0.02);
            lastPrice = Math.max(0.1, lastPrice + change);
            priceHistory.push(lastPrice);
          }
          
          const finalPrice = priceHistory[priceHistory.length - 1];
          const previousPrice = priceHistory[priceHistory.length - 2] || initialPrice;
          const priceDiff = finalPrice - previousPrice;
          const trending = priceDiff > 0.05 ? 'up' : (priceDiff < -0.05 ? 'down' : 'stable');
          const percentChange = ((finalPrice - initialPrice) / initialPrice) * 100;
          
          return {
            ...item,
            current_value: item.current_value || finalPrice.toFixed(2),
            belief_ratio: item.belief_ratio || beliefRatio.toFixed(2),
            trending: item.trending || trending,
            price_history: priceHistory,
            percent_change_24h: item.percent_change_24h || percentChange.toFixed(1)
          };
        }
        return item;
      });
      
      // Update the news array with the new items
      setNews(prevNews => [...prevNews, ...fetchedNews]);
      
      // Update the offset for the next fetch
      setCurrentOffset(prev => prev + fetchedNews.length);
      
      // Update whether there are more items to load
      setHasMore(moreAvailable && fetchedNews.length > 0);
      
    } catch (error) {
      debugLog('Error loading more news:', error);
      // Show a temporary error but don't change the current news array
      setNetworkError("Couldn't load more news. Please try again.");
      setTimeout(() => setNetworkError(null), 3000);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch data once on mount
  useEffect(() => {
    if (!hasLoadedData && news.length === 0) {
      fetchTopNews()
        .then(() => setHasLoadedData(true))
        .catch(() => setHasLoadedData(true));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setNetworkError(null);
      if (news.length === 0 && !isLoading) fetchTopNews();
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
  }, [news.length, isLoading]);

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
    loadMoreNews,
    hasMore,
    totalCount
  };
};
