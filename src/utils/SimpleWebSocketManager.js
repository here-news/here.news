/**
 * Minimal WebSocket connection manager utilities
 */

// Global registry of active WebSocket connections
const activeConnections = {};

// Global registry for message type handlers
const messageTypeHandlers = new Map();

// Last heartbeats for connections
const lastHeartbeats = {};

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
 * @returns {WebSocket} - The WebSocket instance
 */
export const createWebSocketConnection = (endpoint, url, callbacks = {}) => {
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
  };
  
  ws.onmessage = (event) => {
    if (callbacks.onMessage) callbacks.onMessage(event);
    processWebSocketMessage(endpoint, event.data);
  };
  
  ws.onerror = (event) => {
    if (callbacks.onError) callbacks.onError(event);
  };
  
  ws.onclose = (event) => {
    if (callbacks.onClose) callbacks.onClose(event);
    ws._isClosed = true;
    ws._closedAt = Date.now();
    
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
 * Close all active WebSocket connections
 */
export const closeAllConnections = () => {
  Object.keys(activeConnections).forEach(endpoint => {
    closeWebSocketConnection(endpoint);
  });
};

/**
 * Register a handler for a specific message type
 * @param {string} messageType - The message type to handle
 * @param {Function} callback - The callback function to handle messages of this type
 * @returns {Function} - A function to unregister the handler
 */
export const registerMessageTypeHandler = (messageType, callback) => {
  if (!messageTypeHandlers.has(messageType)) {
    messageTypeHandlers.set(messageType, new Set());
  }
  messageTypeHandlers.get(messageType).add(callback);
  return () => {
    if (messageTypeHandlers.has(messageType)) {
      messageTypeHandlers.get(messageType).delete(callback);
      if (messageTypeHandlers.get(messageType).size === 0) {
        messageTypeHandlers.delete(messageType);
      }
    }
  };
};

/**
 * Process WebSocket messages
 * @param {string} connectionKey - The key of the WebSocket connection
 * @param {any} eventData - The data received from the WebSocket
 * @returns {any} - The processed message
 */
function processWebSocketMessage(connectionKey, eventData) {
  try {
    // Handle heartbeats
    if (eventData === 'pong' || eventData === 'ping') {
      lastHeartbeats[connectionKey] = Date.now();
      return; // Don't process pings/pongs further
    }
      
    // Parse JSON message
    let message;
    if (typeof eventData === 'string') {
      try {
        message = JSON.parse(eventData);
      } catch (e) {
        // Not JSON, just return the string
        return eventData;
      }
    } else {
      message = eventData;
    }
    
    if (!message || !message.type) return null;
    
    // Handle message types
    if (messageTypeHandlers.has(message.type)) {
      const handlers = messageTypeHandlers.get(message.type);
      const messageData = message.data || message;
      
      handlers.forEach(handler => {
        try {
          handler(messageData);
        } catch (e) {
          console.error(`Error in message type handler for "${message.type}":`, e);
        }
      });
    }
    
    return message;
  } catch (error) {
    console.error('Error processing WebSocket message:', error);
    return null;
  }
}