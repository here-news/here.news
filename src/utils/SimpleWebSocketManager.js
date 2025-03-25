/**
 * SimpleWebSocketManager - A minimal singleton WebSocket connection manager
 */

// Global registry of active WebSocket connections
const activeConnections = {};

/**
 * Get an existing WebSocket connection if available
 * @param {string} endpoint - Unique identifier for the WebSocket connection
 * @returns {WebSocket|null} - The WebSocket instance or null if not found
 */
export const getWebSocketInstance = (endpoint) => {
  if (!activeConnections[endpoint]) return null;
  
  const ws = activeConnections[endpoint];
  
  // Check if connection is closed/closing
  if (ws._isClosed || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
    if (Date.now() - (ws._closedAt || 0) > 5000) {
      delete activeConnections[endpoint];
    }
    return null;
  }
  
  // Check for stalled connections in connecting state
  if (ws.readyState === WebSocket.CONNECTING && 
      ws._createdAt && Date.now() - ws._createdAt > 15000) {
    ws._isStale = true;
    return null;
  }
  
  return ws;
};

/**
 * Create a new WebSocket connection or return an existing one
 * @param {string} endpoint - Unique identifier for the WebSocket connection
 * @param {string} url - The WebSocket URL to connect to
 * @param {Object} callbacks - Event handlers for the WebSocket
 * @param {Function} callbacks.onOpen - Open event handler
 * @param {Function} callbacks.onMessage - Message event handler
 * @param {Function} callbacks.onError - Error event handler
 * @param {Function} callbacks.onClose - Close event handler
 * @returns {WebSocket} - The WebSocket instance
 */
export const createWebSocketConnection = (endpoint, url, callbacks) => {
  // Cleanup and check for stale connections
  if (activeConnections[endpoint]) {
    const ws = activeConnections[endpoint];
    if (ws._isClosed || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      delete activeConnections[endpoint];
    } else if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
      return ws;
    }
  }

  const ws = new WebSocket(url);
  ws._createdAt = Date.now();
  
  ws.onopen = (event) => {
    if (callbacks.onOpen) callbacks.onOpen(event);
    try {
      window.dispatchEvent(new CustomEvent('websocket_connected', { detail: { endpoint } }));
    } catch (e) {}
  };
  
  ws.onmessage = (event) => {
    if (callbacks.onMessage) callbacks.onMessage(event);
  };
  
  ws.onerror = (event) => {
    if (callbacks.onError) callbacks.onError(event);
  };
  
  ws.onclose = (event) => {
    if (callbacks.onClose) callbacks.onClose(event);
    ws._isClosed = true;
    ws._closedAt = Date.now();
    
    try {
      window.dispatchEvent(new CustomEvent('websocket_closed', { detail: { endpoint, code: event.code } }));
    } catch (e) {}
    
    setTimeout(() => {
      if (activeConnections[endpoint] === ws) {
        delete activeConnections[endpoint];
      }
    }, 8000);
  };
  
  activeConnections[endpoint] = ws;
  return ws;
};

/**
 * Close a WebSocket connection and remove it from the registry
 * @param {string} endpoint - Unique identifier for the WebSocket connection
 */
export const closeWebSocketConnection = (endpoint) => {
  if (activeConnections[endpoint]) {
    try {
      const ws = activeConnections[endpoint];
      delete activeConnections[endpoint];
      ws.close(1000, 'Connection closed by application');
    } catch (err) {
      delete activeConnections[endpoint];
    }
  }
};

/**
 * Get count of active WebSocket connections
 * @returns {number} - Number of active connections
 */
export const getConnectionCount = () => {
  return Object.keys(activeConnections).length;
};

/**
 * Get list of active connection keys
 * @returns {string[]} - Array of active connection keys
 */
export const getActiveConnectionKeys = () => {
  return Object.keys(activeConnections);
};

/**
 * Close all active WebSocket connections
 */
export const closeAllConnections = () => {
  Object.keys(activeConnections).forEach(endpoint => {
    closeWebSocketConnection(endpoint);
  });
};