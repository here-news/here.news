/**
 * SimpleWebSocketManager - A minimal singleton WebSocket connection manager
 * with generic message type handling capabilities
 */

// Global registry of active WebSocket connections
const activeConnections = {};

// Set of balance handlers (for backwards compatibility)
const balanceHandlers = new Set();

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
    processWebSocketMessage(endpoint, event.data);
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

/**
 * Register a handler for a specific message type
 * @param {string} messageType - The message type to handle (or 'field:fieldName' for field-based detection)
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
 * Add a special handler for balance messages (backward compatibility)
 * @param {Function} callback - The callback function to handle balance messages
 * @returns {Function} - A function to unregister the balance handler
 */
export const registerBalanceHandler = (callback) => {
  // Register for explicit balance message types
  const unregisterType1 = registerMessageTypeHandler('balance', callback);
  const unregisterType2 = registerMessageTypeHandler('balance_update', callback);
  
  // Register for field-based detection (presence of quote_balance field)
  const unregisterField = registerMessageTypeHandler('field:quote_balance', callback);
  
  // Also add to legacy balanceHandlers for backward compatibility
  balanceHandlers.add(callback);
  
  // Return function that unregisters all
  return () => {
    unregisterType1();
    unregisterType2();
    unregisterField();
    balanceHandlers.delete(callback);
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
    // Parse JSON message
    let message;
    if (typeof eventData === 'string') {
      if (eventData === 'pong' || eventData === 'ping') {
        lastHeartbeats[connectionKey] = Date.now();
        return; // Don't process pings/pongs further
      }
      
      try {
        message = JSON.parse(eventData);
      } catch (e) {
        // Not JSON, just return the string
        return eventData;
      }
    } else {
      message = eventData;
    }
    
    if (!message) return null;
    
    // GENERIC MESSAGE HANDLING
    
    // 1. Handle explicit message types
    if (message.type && messageTypeHandlers.has(message.type)) {
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
    
    // 2. Handle field-presence message types
    messageTypeHandlers.forEach((handlers, typeKey) => {
      if (typeKey.startsWith('field:')) {
        const fieldName = typeKey.substring(6); // Remove 'field:' prefix
        if (message && typeof message[fieldName] !== 'undefined') {
          const messageData = message.data || message;
          handlers.forEach(handler => {
            try {
              handler(messageData);
            } catch (e) {
              console.error(`Error in field-based handler for "${fieldName}":`, e);
            }
          });
        }
      }
    });
    
    // LEGACY: Handle balance messages specially (for backward compatibility)
    if (message && (
      message.type === 'balance' || 
      message.type === 'balance_update' ||
      (typeof message.quote_balance !== 'undefined')
    )) {
      const balanceData = message.data || message;
      balanceHandlers.forEach(handler => {
        try {
          handler(balanceData);
        } catch (e) {
          console.error('Error in balance handler:', e);
        }
      });
    }
    
    return message;
  } catch (error) {
    console.error('Error processing WebSocket message:', error);
    return null;
  }
}