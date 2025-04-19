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
  self.skipWaiting(); // Force activate immediately
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
    }).then(() => self.clients.claim()) // Take control of all clients
  );
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
  // Only consider HTTP/HTTPS requests
  if (!event.request.url.match(/^(http|https):\/\//)) {
    return;
  }
  
  const url = new URL(event.request.url);
  
  // Check if this is an API call (client-side request)
  const isApiRequest = url.hostname === 'localhost' && url.port === '8282';
  
  // Also identify navigation to app routes with path prefixes that look like API routes
  const isAppNavigation = event.request.mode === 'navigate' && 
    url.hostname === 'localhost' && url.port === '3000' &&
    ['/news/', '/market/', '/me/', '/search/', '/auth/'].some(
      prefix => url.pathname.startsWith(prefix)
    );
  
  // Bypass API requests - let browser handle them directly
  if (isApiRequest) {
    return;
  }
  
  // For SPA navigation to app routes, serve the index.html
  if (isAppNavigation) {
    event.respondWith(
      caches.match('/index.html')
        .then(response => {
          return response || fetch('/index.html');
        })
        .catch(() => {
          return fetch('/index.html');
        })
    );
    return;
  }
  
  // For all other requests (static assets, etc.) use a network-first strategy
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              // Only cache HTTP/HTTPS resources
              if (event.request.url.match(/^(http|https):\/\//)) {
                cache.put(event.request, responseToCache);
              }
            })
            .catch(err => console.error('Cache put error:', err));
        }
        return response;
      })
      .catch(error => {
        console.log('Network request failed, falling back to cache:', error);
        
        return caches.match(event.request)
          .then(cachedResponse => {
            // If it's a navigation request and we don't have it cached, 
            // try to serve index.html instead
            if (!cachedResponse && event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            return cachedResponse || new Response('Network error and no cache available', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle message events (e.g., for manual updates)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
