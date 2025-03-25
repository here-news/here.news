import { useEffect, useState, useCallback, useRef } from 'react';
import serviceUrl from '../config';

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
  reconnectInterval = 5000,
  heartbeatInterval = 30000
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const wsRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3; // Limit reconnect attempts to prevent server flooding
  
  // Function to handle messages received from the WebSocket
  const handleMessage = useCallback((event) => {
    try {
      // Handle text messages
      if (typeof event.data === 'string') {
        // Check for heartbeat messages (ping/pong)
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
          if (onMessage) {
            onMessage(data);
          }
        } catch (e) {
          // Not valid JSON, might be a simple string message
          if (event.data && event.data.length < 100) { // Only log short messages to prevent console spam
            console.log('Received non-JSON string message:', event.data);
          }
        }
      }
    } catch (err) {
      console.error('Error processing WebSocket message:', err);
    }
  }, [onMessage]);

  // Create a valid WebSocket URL
  const getWebSocketUrl = useCallback((path) => {
    // Start with the service URL and convert http to ws
    let wsUrl = serviceUrl.replace('http:', 'ws:').replace('https:', 'wss:');
    
    // Remove any trailing slash from the base URL
    wsUrl = wsUrl.replace(/\/$/, '');
    
    // Ensure path starts with a slash
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    
    // Combine the base URL with the path
    return wsUrl + normalizedPath;
  }, []);

  // Connect to WebSocket with simplified approach
  const connect = useCallback(() => {
    // Only run if we have the required parameters
    if (!newsId) return;
    
    // For user-specific endpoints, require a public key
    if (endpoint.includes('/user/') && !publicKey) return;
    
    // Close existing connection if it exists
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN || 
            wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
      } catch (err) {
        console.error('Error closing existing WebSocket:', err);
      }
      wsRef.current = null;
    }
    
    try {
      // Build a valid WebSocket URL
      let wsPath = endpoint;
      
      // For market endpoints, include the news ID in the URL
      if (endpoint.includes('/market') && !endpoint.includes(newsId)) {
        wsPath = endpoint.replace('/market', `/market/${newsId}`);
      }
      
      // For user endpoints, include the public key in the URL
      if (endpoint.includes('/user') && publicKey && !endpoint.includes(publicKey)) {
        wsPath = endpoint.replace('/user', `/user/${publicKey}`);
      }
      
      // Get the full WebSocket URL
      const wsUrl = getWebSocketUrl(wsPath);
      
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      
      // Validate the URL format
      if (!wsUrl.startsWith('ws')) {
        console.error('Invalid WebSocket URL format:', wsUrl);
        setError('Invalid WebSocket URL');
        return;
      }
      
      // Create a new WebSocket connection
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Configure WebSocket event handlers
      ws.onopen = () => {
        console.log(`WebSocket connected to ${wsPath}`);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Set initial heartbeat timestamp
        setLastHeartbeat(new Date());
        
        // For position updates, send a simple subscription message
        if (wsPath.includes('position')) {
          setTimeout(() => { // Small delay to let server initialize
            try {
              ws.send(JSON.stringify({
                type: 'subscribe',
                newsId: newsId
              }));
            } catch (err) {
              console.error('Error sending subscribe message:', err);
            }
          }, 100);
        }
        
        // Start a heartbeat ping
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            } catch (err) {
              console.error('Error sending heartbeat ping:', err);
            }
          }
        }, heartbeatInterval);
      };
      
      ws.onmessage = handleMessage;
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        setIsConnected(false);
        wsRef.current = null;
        
        // Clear heartbeat interval
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // Only attempt to reconnect for unexpected closures
        const isAbnormalClosure = event.code !== 1000 && event.code !== 1001;
        if (isAbnormalClosure && reconnectAttemptsRef.current < maxReconnectAttempts) {
          // Calculate delay with exponential backoff
          const delay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
            30000 // Maximum 30 second delay
          );
          
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (err) {
      console.error('Error establishing WebSocket connection:', err);
      setError(`WebSocket connection failed: ${err.message}`);
    }
  }, [newsId, publicKey, endpoint, handleMessage, reconnectInterval, heartbeatInterval, getWebSocketUrl]);

  // Force a reconnection
  const reconnect = useCallback(() => {
    // Close existing connection
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (err) {
        console.error('Error closing WebSocket for reconnect:', err);
      }
      wsRef.current = null;
    }
    
    // Reset reconnect attempts counter
    reconnectAttemptsRef.current = 0;
    setIsConnected(false);
    
    // Reconnect after a short delay
    setTimeout(connect, 500);
  }, [connect]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear heartbeat interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    // Close the WebSocket connection
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (err) {
        console.error('Error closing WebSocket:', err);
      }
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setLastHeartbeat(null);
  }, []);

  // Send a message through the WebSocket
  const sendMessage = useCallback((message) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket is not connected');
      return false;
    }
    
    try {
      const messageStr = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
        
      wsRef.current.send(messageStr);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }, []);

  // Connect when component mounts or dependencies change
  useEffect(() => {
    // Only connect if we have the minimum required parameters
    const canConnect = newsId && (
      !endpoint.includes('/user/') || // Non-user endpoints just need newsId
      (endpoint.includes('/user/') && publicKey) // User endpoints need publicKey too
    );
    
    if (canConnect) {
      connect();
    }
    
    // Clean up on unmount or when dependencies change
    return () => {
      disconnect();
    };
  }, [newsId, publicKey, connect, disconnect, endpoint]);

  // Check if we have recent heartbeats (within last minute)
  const hasRecentHeartbeat = lastHeartbeat && 
    (new Date().getTime() - lastHeartbeat.getTime() < 60000);

  return {
    isConnected,
    lastMessage,
    error,
    lastHeartbeat,
    hasRecentHeartbeat,
    connect,
    disconnect,
    reconnect,
    sendMessage
  };
};

export default useWebSocketConnection;