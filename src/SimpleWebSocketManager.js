import { useEffect, useRef } from 'react';
import serviceUrl from './config';

// Simple WebSocket manager for handling real-time communications
class SimpleWebSocketManager {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.socket = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.connectionHandlers = [];
    this.disconnectionHandlers = [];
    this.errorHandlers = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.updateUserBalance = null; // Will be set by the component using this manager
  }

  // Initialize connection with better error handling
  connect() {
    if (this.socket) return;

    console.log(`Connecting to WebSocket at ${this.url}`);
    
    try {
      // Use a wrapper to safely create the WebSocket
      this.createWebSocketConnection();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      // Schedule a reconnection attempt
      setTimeout(() => {
        this.reconnectAttempts++;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          this.connect();
        }
      }, this.reconnectDelay);
    }
  }

  // Helper method to create WebSocket connection
  createWebSocketConnection() {
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.connectionHandlers.forEach(handler => handler());
      };
      
      this.socket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        this.isConnected = false;
        this.disconnectionHandlers.forEach(handler => handler(event));
        
        // Attempt to reconnect if the connection was closed unexpectedly
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(), this.reconnectDelay);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.errorHandlers.forEach(handler => handler(error));
      };
      
      this.socket.onmessage = (event) => {
        this.processWebSocketMessage(event);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      throw error; // Rethrow for the connect method to handle
    }
  }

  // Close connection
  disconnect() {
    if (this.socket && this.isConnected) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Send a message to the server
  sendMessage(type, data = {}) {
    if (!this.isConnected || !this.socket) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }
    
    try {
      const message = JSON.stringify({
        type,
        ...data
      });
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  // Register a handler for a specific message type
  onMessage(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type).add(handler);
    
    // Return a function to remove this handler
    return () => {
      const handlersForType = this.messageHandlers.get(type);
      if (handlersForType) {
        handlersForType.delete(handler);
        if (handlersForType.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  // Register connection handlers
  onConnect(handler) {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  // Register disconnection handlers
  onDisconnect(handler) {
    this.disconnectionHandlers.push(handler);
    return () => {
      this.disconnectionHandlers = this.disconnectionHandlers.filter(h => h !== handler);
    };
  }

  // Register error handlers
  onError(handler) {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
    };
  }

  // Process incoming WebSocket messages with better error handling
  processWebSocketMessage(event) {
    try {
      // Handle non-JSON messages gracefully
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (parseError) {
        console.warn('Received non-JSON WebSocket message:', event.data);
        return;
      }

      const { type } = message;
      
      if (!type) {
        console.warn('Received WebSocket message without type:', message);
        return;
      }
      
      // Handle specific message types
      if (type === 'balance' && typeof this.updateUserBalance === 'function') {
        // Ensure balance is a number
        const balance = typeof message.balance === 'string' 
          ? parseFloat(message.balance) 
          : message.balance;
          
        if (!isNaN(balance)) {
          this.updateUserBalance(balance);
        } else {
          console.warn('Received invalid balance value:', message.balance);
        }
      }
      
      // Call registered handlers for this message type
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error(`Error in message type handler for "${type}":`, error);
          }
        });
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }

  // Set the updateUserBalance function
  setUpdateUserBalanceFunction(fn) {
    if (typeof fn === 'function') {
      this.updateUserBalance = fn;
    } else {
      console.error('updateUserBalance must be a function');
    }
  }
}

// Create a singleton instance
const webSocketUrl = `${serviceUrl.replace('http', 'ws')}/ws`;
const webSocketManager = new SimpleWebSocketManager(webSocketUrl, {
  maxReconnectAttempts: 10,
  reconnectDelay: 2000
});

// React hook to use the WebSocket manager
export const useWebSocket = (userContext) => {
  const wsRef = useRef(webSocketManager);

  useEffect(() => {
    // If a user context is provided, set up the updateUserBalance function
    if (userContext && userContext.updateUserBalance) {
      wsRef.current.setUpdateUserBalanceFunction(userContext.updateUserBalance);
    }
    
    // Connect when the component mounts
    wsRef.current.connect();
    
    // Clean up when the component unmounts
    return () => {
      wsRef.current.disconnect();
    };
  }, [userContext]);

  return wsRef.current;
};

export default webSocketManager;