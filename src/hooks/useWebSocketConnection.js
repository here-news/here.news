import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import serviceUrl from '../config';
import { createWebSocketConnection, getWebSocketInstance, closeWebSocketConnection } from '../utils/SimpleWebSocketManager';

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
  endpoint = '/ws/positions',
  newsId,
  publicKey,
  onMessage,
  reconnectInterval = 50000,
  heartbeatInterval = 60000
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const heartbeatIntervalRef = useRef(null);
  const wsRef = useRef(null);
  const instanceIdRef = useRef(Math.random().toString(36).substring(2, 9));
  
  // Create a WebSocket connection key for registry lookup
  const connectionKey = useMemo(() => {
    let wsPath = endpoint;
    
    if (endpoint.includes('/market') && !endpoint.includes(newsId)) {
      wsPath = endpoint.replace('/market', `/market/${newsId}`);
    }
    
    if (endpoint.includes('/user') && publicKey && !endpoint.includes(publicKey)) {
      wsPath = endpoint.replace('/user', `/user/${publicKey}`);
    }
    
    return `${wsPath}`;
  }, [endpoint, newsId, publicKey]);
  
  // Function to handle messages received from the WebSocket
  const handleMessage = useCallback((event) => {
    if (typeof event.data === 'string') {
      // Check for heartbeat messages
      if (event.data === 'pong' || event.data === 'ping') {
        setLastHeartbeat(new Date());
        return;
      }
      
      try {
        const data = JSON.parse(event.data);
        
        // Check for heartbeat-type messages in JSON format
        if (data && (data.type === 'pong' || data.type === 'ping')) {
          setLastHeartbeat(new Date());
          return;
        }
        
        // Set the last message and forward to caller's handler
        setLastMessage(data);
        if (onMessage) onMessage(data);
      } catch (e) {
        // Not valid JSON, ignore silently
      }
    }
  }, [onMessage]);
  
  // Get WebSocket URL
  const getWebSocketUrl = useCallback((path) => {
    let wsUrl = serviceUrl.replace('http:', 'ws:').replace('https:', 'wss:');
    wsUrl = wsUrl.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    return wsUrl + normalizedPath;
  }, []);
  
  // Build the WebSocket URL
  const wsUrl = useMemo(() => {
    let wsPath = endpoint;
    
    if (endpoint.includes('/market') && !endpoint.includes(newsId)) {
      wsPath = endpoint.replace('/market', `/market/${newsId}`);
    }
    
    if (endpoint.includes('/user') && publicKey && !endpoint.includes(publicKey)) {
      wsPath = endpoint.replace('/user', `/user/${publicKey}`);
    }
    
    return getWebSocketUrl(wsPath);
  }, [endpoint, newsId, publicKey, getWebSocketUrl]);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    // Only run if we have the required parameters
    if (!newsId) return;
    if (endpoint.includes('/user/') && !publicKey) return;
    if (!wsUrl.startsWith('ws')) {
      setError('Invalid WebSocket URL');
      return;
    }
    
    // Clear existing heartbeat interval if any
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    // Define event handlers
    const callbacks = {
      onOpen: () => {
        setIsConnected(true);
        setError(null);
        setLastHeartbeat(new Date());
        
        // For position updates, send subscription
        if (endpoint.includes('position')) {
          setTimeout(() => {
            const ws = getWebSocketInstance(connectionKey);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'subscribe',
                newsId: newsId
              }));
            }
          }, 100);
        }
        
        // Set up heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          const ws = getWebSocketInstance(connectionKey);
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
      }
    };
    
    // Check if we already have an active connection
    const existingWs = getWebSocketInstance(connectionKey);
    
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      // Reuse open connection
      wsRef.current = existingWs;
      setIsConnected(true);
      setError(null);
      setLastHeartbeat(new Date());
      
      // Set up heartbeat for this instance
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      heartbeatIntervalRef.current = setInterval(() => {
        const ws = getWebSocketInstance(connectionKey);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, heartbeatInterval);
      
      // We still need to handle messages from the existing connection
      // The message event is already set up in the existing connection
    } else {
      // Create a new connection or reuse connecting one
      wsRef.current = createWebSocketConnection(connectionKey, wsUrl, callbacks);
    }
  }, [connectionKey, wsUrl, newsId, publicKey, endpoint, handleMessage, heartbeatInterval]);
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    wsRef.current = null;
    setIsConnected(false);
    setLastHeartbeat(null);
  }, []);
  
  // Force a reconnection with longer delay to prevent bouncing
  const reconnect = useCallback(() => {
    disconnect();
    closeWebSocketConnection(connectionKey);
    setTimeout(() => connect(), 8000);
  }, [connect, disconnect, connectionKey]);
  
  // Send a message
  const sendMessage = useCallback((message) => {
    const ws = getWebSocketInstance(connectionKey);
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    
    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      ws.send(messageStr);
      return true;
    } catch (error) {
      return false;
    }
  }, [connectionKey]);
  
  // Connect when component mounts or dependencies change
  useEffect(() => {
    const canConnect = newsId && (
      !endpoint.includes('/user/') || 
      (endpoint.includes('/user/') && publicKey)
    );
    
    if (canConnect) {
      // Small delay to avoid rapid connection/disconnection cycles
      const timer = setTimeout(() => connect(), 200);
      return () => {
        clearTimeout(timer);
        disconnect();
      };
    }
    
    return disconnect;
  }, [newsId, publicKey, connect, disconnect, endpoint, connectionKey]);
  
  // Check for recent heartbeats
  const hasRecentHeartbeat = lastHeartbeat && 
    (new Date().getTime() - lastHeartbeat.getTime() < 75000);
  
  return {
    isConnected,
    lastMessage,
    error,
    lastHeartbeat,
    hasRecentHeartbeat,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    instanceId: instanceIdRef.current
  };
};

export default useWebSocketConnection;