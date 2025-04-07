// Service Worker for NewsColossal application - offline support

const CACHE_NAME = 'news-colossal-v1';
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/static/logo.svg',
  '/static/3d.webp',
  '/manifest.json'
];

// Install event - precache static resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .catch(err => {
        console.error('Error during service worker install:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
      .catch(err => {
        console.error('Error during service worker activation:', err);
      })
  );
});

// Fetch event - network first with cache fallback strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip Chrome extension requests and non-HTTP(S) requests
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;
  
  // Special handling for API requests
  if (url.pathname.includes('/api/') || url.pathname.includes('/topnews') || url.pathname.includes('/news/')) {
    event.respondWith(networkFirstWithTimeout(event.request));
    return;
  }
  
  // For everything else, use cache-first approach for static assets
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a successful response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response since it can only be consumed once
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(err => {
                console.error('Error caching new resource:', err);
              });
              
            return response;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html')
                .then(offlineResponse => {
                  return offlineResponse || new Response('You are offline. Please check your connection.', {
                    headers: { 'Content-Type': 'text/html' }
                  });
                });
            }
            
            // Just return the error for other requests
            return Promise.reject(error);
          });
      })
  );
});

// Network first with timeout function for API requests
function networkFirstWithTimeout(request, timeout = 4000) {
  return new Promise((resolve, reject) => {
    // Track whether we've resolved already
    let timeoutId;
    let hasResolved = false;

    // Resolve once with the first response we get
    const resolveOnce = response => {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(timeoutId);
        resolve(response);
      }
    };

    // Try network first
    const networkPromise = fetch(request.clone())
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clonedResponse = response.clone();
          caches.open('news-data')
            .then(cache => cache.put(request, clonedResponse))
            .catch(err => console.error('Failed to cache response:', err));
        }
        return resolveOnce(response);
      })
      .catch(error => {
        console.error('Network fetch failed:', error);
        // If network fails, we'll fall back to cache below
      });

    // Set timeout to switch to cache if network is too slow
    timeoutId = setTimeout(() => {
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log('Using cached response due to timeout');
            resolveOnce(cachedResponse);
          }
          // If nothing in cache, wait for network to finish or fail
        })
        .catch(error => {
          console.error('Cache match failed:', error);
          // If cache fails too, wait for network
        });
    }, timeout);

    // If network fails completely, use cache
    networkPromise
      .catch(() => {
        caches.match(request)
          .then(cachedResponse => {
            if (cachedResponse) {
              resolveOnce(cachedResponse);
            } else {
              resolveOnce(new Response(JSON.stringify({
                error: 'You are offline and no cached data is available.'
              }), {
                headers: { 'Content-Type': 'application/json' }
              }));
            }
          })
          .catch(error => {
            console.error('Cache match failed after network failure:', error);
            reject(error);
          });
      });
  });
}

// Handle service worker errors
self.addEventListener('error', event => {
  console.error('Service worker error:', event.message);
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection in service worker:', event.reason);
});
