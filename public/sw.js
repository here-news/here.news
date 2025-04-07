// Service Worker for News App
const CACHE_NAME = 'news-app-cache-v1';
const ASSETS_CACHE_NAME = 'news-assets-cache-v1';
const API_CACHE_NAME = 'news-api-cache-v1';
const OFFLINE_PAGE = '/offline.html';

// Assets that should be cached on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/static/logo.svg',
  '/static/3d.webp',
  '/offline.html',
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(ASSETS_CACHE_NAME)
      .then(cache => {
        // Cache all static assets but don't fail installation on error
        return cache.addAll(STATIC_ASSETS)
          .catch(error => {
            console.error('Failed to cache some assets during install:', error);
            // Continue with installation even if some assets fail to cache
          });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== ASSETS_CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      ).then(() => self.clients.claim());
    })
  );
});

// Helper function to handle failed fetches
const handleFetchError = (request, error) => {
  console.warn('Fetch failed for:', request.url, error);

  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    return caches.match(OFFLINE_PAGE)
      .then(response => response || new Response('You are offline and we could not find any cached content.', {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      }));
  }

  // Return placeholder image for image requests
  if (request.destination === 'image') {
    return caches.match('/static/3d.webp')
      .then(response => response || new Response('Image not available offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      }));
  }

  // For API requests, try to return cached data
  if (request.url.includes('/api/') || request.url.includes('/topnews') || request.url.includes('/news/')) {
    return caches.match(request)
      .then(response => response || new Response(JSON.stringify({ error: 'Network request failed' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }));
  }

  // Default empty response
  return new Response('Network request failed and no cached version available', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' }
  });
};

// Fetch event - network first for API, cache first for assets
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdn.jsdelivr.net')) {
    return;
  }

  // Handle 404s for hot-update files that might be requested during development
  if (event.request.url.includes('.hot-update.js')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response('// Hot update not available in production', {
          status: 200,
          headers: { 'Content-Type': 'application/javascript' }
        }))
    );
    return;
  }

  // Handle CDN resources specially
  if (event.request.url.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(event.request, { mode: 'cors', credentials: 'omit' })
            .then(response => {
              if (!response || response.status !== 200) {
                throw new Error('Invalid response from CDN');
              }

              // Clone the response to cache it
              const responseToCache = response.clone();
              caches.open(ASSETS_CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache))
                .catch(err => console.error('Failed to cache CDN resource:', err));

              return response;
            })
            .catch(error => {
              console.warn('Failed to fetch CDN resource:', error);
              
              // For msgpack specifically, provide a local fallback
              if (event.request.url.includes('@msgpack/msgpack')) {
                return caches.match('/static/js/msgpack.min.js')
                  .catch(() => handleFetchError(event.request, error));
              }
              
              return handleFetchError(event.request, error);
            });
        })
    );
    return;
  }

  // API request strategy: network first, then cache
  if (event.request.url.includes('/api/') || event.request.url.includes('/topnews') || event.request.url.includes('/news/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response to cache it
          const responseToCache = response.clone();
          caches.open(API_CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache))
            .catch(err => console.error('Failed to cache API response:', err));

          return response;
        })
        .catch(error => {
          console.warn('Network request failed, trying cache:', error);
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return handleFetchError(event.request, error);
            });
        })
    );
    return;
  }

  // Static assets: cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200) {
              return response;
            }

            // Clone the response to cache it
            const responseToCache = response.clone();
            caches.open(ASSETS_CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache))
              .catch(err => console.error('Failed to cache asset:', err));

            return response;
          })
          .catch(error => handleFetchError(event.request, error));
      })
  );
});

// Add an event listener for message events from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
