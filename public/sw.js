// Service Worker for HN2 application

const CACHE_NAME = 'hn2-app-cache-v1';

// Install event - cache key assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll([
          '/',
          '/index.html',
          '/static/js/main.chunk.js',
          '/static/js/0.chunk.js',
          '/static/js/bundle.js',
          '/manifest.json',
          '/favicon.ico'
        ]);
      })
      .catch(error => {
        console.error('Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - network first with cache fallback strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      try {
        // Safely handle potential issues with the fetch request itself
        if (!event.request || !event.request.url) {
          throw new Error('Invalid request');
        }

        // Try network first
        const networkResponse = await fetch(event.request.clone());
        
        // If successful, clone and cache the response
        if (networkResponse && networkResponse.status === 200) {
          try {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, networkResponse.clone());
          } catch (cacheError) {
            console.error('Failed to cache response:', cacheError);
            // Continue even if caching fails
          }
        }
        
        return networkResponse;
      } catch (error) {
        console.error('Fetch error:', error);
        
        try {
          // Network error, try to get from cache
          const cachedResponse = await caches.match(event.request);
          
          // If we have a cached response, return it
          if (cachedResponse) {
            return cachedResponse;
          }
        } catch (cacheError) {
          console.error('Cache match error:', cacheError);
          // Continue to fallback response if cache matching fails
        }
        
        // If no cached response, return a proper error response
        console.error('Fetch failed and no cache available:', error);
        return new Response('Network error occurred', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })().catch(criticalError => {
      // Final fallback for any unhandled promise rejections in the async function
      console.error('Critical fetch handler error:', criticalError);
      return new Response('Service worker error', { 
        status: 500, 
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});

// Handle message events
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
