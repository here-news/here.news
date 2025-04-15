// src/services/api.js
// Centralized API utility for handling JWT, public/protected requests, and error handling

// Initialize jwtToken from localStorage if present
let jwtToken = localStorage.getItem('jwtToken') || null;

export function setJwtToken(token) {
  jwtToken = token;
}

export function clearJwtToken() {
  jwtToken = null;
  localStorage.removeItem('jwtToken'); // Also clear from localStorage
}

/**
 * Make an API request with optional JWT authentication.
 * @param {string} url - The endpoint URL (absolute or relative).
 * @param {object} options - Fetch options (method, headers, body, etc).
 * @param {boolean} isProtected - If true, attaches JWT token.
 * @returns {Promise<Response>} - The fetch response.
 */
export async function apiRequest(url, options = {}, isProtected = false) {
  const headers = options.headers ? { ...options.headers } : {};
  
  // Get the public key from localStorage for all requests
  const publicKey = localStorage.getItem('publicKey');
  
  // For protected requests, add JWT token
  if (isProtected && jwtToken) {
    headers['Authorization'] = `Bearer ${jwtToken}`;
  }
  
  // Add public key header for backwards compatibility and identifying the user
  if (publicKey) {
    headers['X-Public-Key'] = publicKey;
  }
  
  const fetchOptions = { ...options, headers };
  const response = await fetch(url, fetchOptions);
  
  // Handle authentication errors
  if (response.status === 401 || response.status === 403) {
    // Optionally, trigger logout or token refresh logic here
    // For now, just clear the token
    clearJwtToken();
  }
  
  return response;
}

// Helper to get the current JWT token (for debugging/testing)
export function getJwtToken() {
  return jwtToken;
}
