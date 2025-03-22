// src/config.js
/**
 * This module configures the API service URL based on the current hostname.
 * The API always runs on port 8282, but we need to ensure it's accessed through
 * the same hostname as the web app to avoid CORS issues.
 * 
 * IMPORTANT: We're forcing the use of window.location.hostname for all API connections
 * to ensure that remote machines use the IP they accessed the app with.
 * 
 * This module also provides a WebSocket URL helper for WebSocket connections.
 */

// Immediately invoked function to calculate service URL at runtime
const serviceUrl = (() => {
  // If running in server-side or no window, exit early
  if (typeof window === 'undefined') {
    return 'http://localhost:8282'; // default for SSR
  }
  
  // Get current hostname and protocol
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Check if we're running in development mode (port 3000)
  const isDevelopment = window.location.port === '3000';
  
  // Handle CORS issues by using explicit IP for local development
  let apiUrl;
  if (isDevelopment && (hostname === 'localhost' || /^192\.168\./.test(hostname))) {
    // Use direct API URL for local development
    apiUrl = `http://${hostname}:8282`;
    console.log('Development mode detected, using direct API URL');
  } else {
    // Use standard URL for production
    apiUrl = `${protocol}//${hostname}:8282`;
  }
  
  console.log(`API URL configured as: ${apiUrl} (based on hostname: ${hostname})`);
  return apiUrl;
})();

// WebSocket URL helper with server detection and protocol support
export const getWebSocketUrl = (path) => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Check if WebSockets are supported in current browser
    if (!window.WebSocket) {
      console.warn('WebSockets are not supported in this browser');
      return null;
    }
    
    // Start with the HTTP URL
    let wsUrl = serviceUrl;
    
    // Replace http:// with ws:// and https:// with wss://
    wsUrl = wsUrl.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://');
    
    // Add the path if provided
    if (path) {
      // Make sure path starts with slash
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      wsUrl += path;
    }
    
    // Store WebSocket availability in localStorage for faster future checks
    const wsCheckKey = 'ws_checked_' + window.location.hostname.replace(/\./g, '_');
    const wsAvailable = localStorage.getItem(wsCheckKey);
    
    // If we've already determined WebSockets aren't available, return null
    if (wsAvailable === 'false') {
      // Check if it's been a while since we last checked
      const lastCheck = localStorage.getItem('ws_last_check_time');
      const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
      
      if (lastCheck && (Date.now() - parseInt(lastCheck)) < ONE_HOUR) {
        console.warn('WebSockets previously determined to be unavailable (within the last hour)');
        return null;
      }
      
      // It's been a while, so let's try again
      console.log('Trying WebSockets again after previous failure');
    }
    
    console.log(`WebSocket URL configured as: ${wsUrl}`);
    return wsUrl;
  } catch (error) {
    console.error('Error creating WebSocket URL:', error);
    return null;
  }
};

// Helper to check if WebSockets are working with the current backend
export const checkWebSocketAvailability = () => {
  if (typeof window === 'undefined') return false;
  
  const wsCheckKey = 'ws_checked_' + window.location.hostname.replace(/\./g, '_');
  const lastCheck = localStorage.getItem('ws_last_check_time');
  const wsAvailable = localStorage.getItem(wsCheckKey);
  
  // If we've checked in the last hour and they're available, return true
  const ONE_HOUR = 60 * 60 * 1000;
  if (lastCheck && wsAvailable === 'true' && (Date.now() - parseInt(lastCheck)) < ONE_HOUR) {
    return true;
  }
  
  // If we've checked in the last hour and they're unavailable, return false
  if (lastCheck && wsAvailable === 'false' && (Date.now() - parseInt(lastCheck)) < ONE_HOUR) {
    return false;
  }
  
  // Otherwise, we'll need a fresh check performed
  return null;
};

// Export the pre-calculated service URL
export default serviceUrl;
