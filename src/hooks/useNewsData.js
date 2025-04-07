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
      const data = await fetchWithFallback(`${serviceUrl}/topnews?range=2h&limit=9&_=${cacheBuster}`);
      
      // Process response data
      let fetchedNews = [];
      
      if (Array.isArray(data)) {
        fetchedNews = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.results)) fetchedNews = data.results;
        else if (Array.isArray(data.data)) fetchedNews = data.data;
        else if (Array.isArray(data.items)) fetchedNews = data.items;
        else if (Array.isArray(data.news)) fetchedNews = data.news;
        else {
          const keys = Object.keys(data).filter(key => key !== 'status' && key !== 'message');
          if (keys.length > 0 && data[keys[0]] && typeof data[keys[0]] === 'object') {
            fetchedNews = Object.values(data);
          } else {
            fetchedNews = [data];
          }
        }
      }
      
      if (!Array.isArray(fetchedNews) || fetchedNews.length === 0) {
        throw new Error('Could not extract news array from API response');
      }
      
      // Add trading data where missing
      fetchedNews = fetchedNews.map(item => {
        if (!item.price_history) {
          const priceHistory = [];
          const trendBias = Math.random() > 0.5 ? 1 : -1;
          const initialPrice = (Math.random() * 3 + 0.5);
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
          await cache.put(`${serviceUrl}/topnews?range=2h&limit=9`, response);
        } catch (cacheError) {
          debugLog('Failed to cache news data:', cacheError);
        }
      }
      
      setRetryCount(0);
      setNews(fetchedNews);
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
        const cachedResponse = await cache.match(`${serviceUrl}/topnews?range=2h&limit=9`);
        
        if (cachedResponse) {
          const cachedData = await cachedResponse.json();
          setNews(cachedData);
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
  
  // Load more news
  const loadMoreNews = () => {
    setIsLoadingMore(true);
    setTimeout(() => setIsLoadingMore(false), 1000);
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
    activeIndex,
    setActiveIndex,
    isLoading,
    networkError,
    retryCount,
    setRetryCount,
    isLoadingMore,
    fetchTopNews,
    loadMoreNews
  };
};
