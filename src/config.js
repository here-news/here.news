// src/config.js
/**
 * This module configures the API service URL based on the current hostname.
 * The API always runs on port 8282, but we need to ensure it's accessed through
 * the same hostname as the web app to avoid CORS issues.
 * 
 * IMPORTANT: We're forcing the use of window.location.hostname for all API connections
 * to ensure that remote machines use the IP they accessed the app with.
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

// Export the pre-calculated service URL
export default serviceUrl;
