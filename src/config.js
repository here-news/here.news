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
  
  // IMPORTANT: ALWAYS use the current hostname with port 8282
  // This is the key to allowing remote machines to access the API
  // Ignore environment variables since they're causing the issue with remote access
  const apiUrl = `${protocol}//${hostname}:8282`;
  
  console.log(`API URL configured as: ${apiUrl} (based on hostname: ${hostname})`);
  return apiUrl;
})();

// Export the pre-calculated service URL
export default serviceUrl;
