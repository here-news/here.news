import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import serviceUrl from '../config';
import { 
  getWebSocketInstance, 
  createWebSocketConnection, 
  closeWebSocketConnection,
  registerMessageTypeHandler
} from '../utils/SimpleWebSocketManager';

/**
 * Custom hook for managing WebSocket connections with simplified protocol
 * @param {Object} options - Configuration options for the WebSocket
 * @param {string} options.endpoint - WebSocket endpoint path (e.g., '/ws/positions')
 * @param {string} options.newsId - The UUID of the news article
 * @param {string} options.publicKey - User's public key for authentication
 * @param {Function} options.onMessage - Callback function for incoming messages
 * @param {number} options.reconnectInterval - Time in ms between reconnection attempts (default: 5000)
 * @param {number} options.heartbeatInterval - Time in ms between heartbeats (default: 30000)
 * @returns {Object} WebSocket connection state and control functions
 */
const useWebSocketConnection = ({
  endpoint = '/ws/user',
  newsId,
  publicKey,
  onMessage,
  reconnectInterval = 5000,
  heartbeatInterval = 30000
}) => {
  // State for connection status
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  
  // Refs for cleanup
  const heartbeatIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // Generate WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    let wsPath = endpoint;
    
    // Handle newsId in path
    if (endpoint.includes('/market') && newsId && !endpoint.includes(newsId)) {
      wsPath = endpoint.replace('/market', `/market/${newsId}`);
    }
    
    // Handle publicKey in path
    if (endpoint.includes('/user') && publicKey && !endpoint.includes(publicKey)) {
      wsPath = endpoint.replace('/user', `/user/${publicKey}`);
    }
    
    // Convert HTTP to WebSocket protocol
    let wsUrl = serviceUrl.replace('http:', 'ws:').replace('https:', 'wss:');
    wsUrl = wsUrl.replace(/\/$/, '');
    const normalizedPath = wsPath.startsWith('/') ? wsPath : '/' + wsPath;
    
    return `${wsUrl}${normalizedPath}`;
  }, [endpoint, newsId, publicKey]);

  // Generate unique connection key
  const connectionKey = useCallback(() => {
    let key = endpoint;
    if (newsId) key += `-${newsId}`;
    if (publicKey) key += `-${publicKey}`;
    return key;
  }, [endpoint, newsId, publicKey]);

  // Message handler
  const handleMessage = useCallback((event) => {
    try {
      if (typeof event.data === 'string') {
        // Handle heartbeats
        if (event.data === 'pong' || event.data === 'ping') {
          setLastHeartbeat(new Date());
          return;
        }
        
        // Parse JSON
        try {
          const data = JSON.parse(event.data);
          
          // Check for heartbeats in JSON
          if (data && (data.type === 'pong' || data.type === 'ping')) {
            setLastHeartbeat(new Date());
            return;
          }
          
          // Process normal message
          setLastMessage(data);
          if (onMessage) onMessage(data);
        } catch (e) {
          // Not valid JSON
          if (onMessage && event.data) onMessage(event.data);
        }
      }
    } catch (err) {
      console.error('Error processing message in useWebSocketConnection:', err);
    }
  }, [onMessage]);

  // Connect function
  const connect = useCallback(() => {
    // Only run if we have required parameters
    if ((endpoint.includes('/market/') && !newsId) ||
        (endpoint.includes('/user/') && !publicKey)) {
      return;
    }
    
    const key = connectionKey();
    const url = getWebSocketUrl();
    
    createWebSocketConnection(key, url, {
      onOpen: () => {
        setIsConnected(true);
        setError(null);
        setLastHeartbeat(new Date());
        
        // Send subscription for position updates if needed
        if (endpoint.includes('position') && newsId) {
          setTimeout(() => {
            const ws = getWebSocketInstance(key);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'subscribe',
                newsId: newsId
              }));
            }
          }, 100);
        }
        
        // Set up heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        heartbeatIntervalRef.current = setInterval(() => {
          const ws = getWebSocketInstance(key);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, heartbeatInterval);
      },
      
      onMessage: handleMessage,
      
      onError: () => {
        setError('WebSocket connection error');
      },
      
      onClose: () => {
        setIsConnected(false);
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        // Attempt reconnect
        if (reconnectInterval > 0) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      }
    });
  }, [connectionKey, getWebSocketUrl, handleMessage, heartbeatInterval, reconnectInterval, endpoint, newsId]);

  // Disconnect function
  const disconnect = useCallback(() => {
    const key = connectionKey();
    
    // Clear intervals and timeouts
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    closeWebSocketConnection(key);
    setIsConnected(false);
  }, [connectionKey]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    const canConnect = 
      !endpoint.includes('/market/') || (endpoint.includes('/market/') && newsId) ||
      !endpoint.includes('/user/') || (endpoint.includes('/user/') && publicKey);
    
    if (canConnect) {
      // Small delay to avoid rapid connection/disconnection cycles
      const timer = setTimeout(() => connect(), 200);
      return () => {
        clearTimeout(timer);
        disconnect();
      };
    }
    
    return disconnect;
  }, [connect, disconnect, endpoint, newsId, publicKey]);

  // Send message helper
  const sendMessage = useCallback((message) => {
    const ws = getWebSocketInstance(connectionKey());
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      ws.send(messageStr);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }, [connectionKey]);

  // Register for specific message types
  const registerForMessageType = useCallback((messageType, callback) => {
    return registerMessageTypeHandler(messageType, callback);
  }, []);

  // Is heartbeat recent?
  const hasRecentHeartbeat = lastHeartbeat && 
    (new Date().getTime() - lastHeartbeat.getTime() < 35000);

  return {
    isConnected,
    lastMessage,
    error,
    lastHeartbeat,
    hasRecentHeartbeat,
    connect,
    disconnect,
    sendMessage,
    registerForMessageType,
    connectionKey: connectionKey()
  };
};

export default useWebSocketConnection;