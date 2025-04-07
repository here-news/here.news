// Service worker registration utility

/**
 * Register the service worker with appropriate error handling
 */
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('New service worker installing:', newWorker);
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New content is available; please refresh.');
                // Optionally show a notification to the user that a new version is available
              }
            });
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
        
      // Handle service worker updates
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('Controller changed, refreshing page');
        window.location.reload();
      });
    });
  } else {
    console.log('Service workers are not supported in this browser');
  }
}

/**
 * Unregister all service workers
 */
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}

/**
 * Update the service worker immediately
 */
export function update() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.update();
      })
      .catch(error => {
        console.error('Service Worker update failed:', error);
      });
  }
}

export default { register, unregister, update };
