# WebSocket Architecture Documentation

## Overview

The WebSocket architecture has been redesigned to provide a more flexible, efficient, and maintainable system for handling real-time communications. The new architecture uses a generic message routing system that allows components to subscribe only to the specific message types they're interested in.

## Key Components

### 1. SimpleWebSocketManager (src/utils/SimpleWebSocketManager.js)

This is a singleton service that manages WebSocket connections across the application. Key features:

- **Connection Management**: Creates, tracks, and closes WebSocket connections
- **Message Routing**: Routes messages to interested components based on message type or field presence
- **Heartbeat Tracking**: Monitors connection health
- **Generic Subscription System**: Allows components to register for specific message types

```javascript
// Register for a specific message type
const unregisterHandler = registerMessageTypeHandler('market_update', (data) => {
  // Handle market update data
});

// Register for messages with a specific field
const unregisterFieldHandler = registerMessageTypeHandler('field:quote_balance', (data) => {
  // Handle any message containing quote_balance field
});

// Later, when component unmounts
unregisterHandler();
unregisterFieldHandler();
```

### 2. useWebSocketConnection Hook (src/hooks/useWebSocketConnection.js)

This React hook provides a standardized interface for components to connect to and interact with WebSockets:

- **Connection Management**: Automatically connects/disconnects based on component lifecycle
- **Reconnection Logic**: Handles reconnection on errors or disconnects
- **Message Type Registration**: Provides an easy way to register for specific message types
- **Heartbeat Maintenance**: Keeps connections alive with periodic pings

```javascript
// In a React component
const websocket = useWebSocketConnection({
  endpoint: '/ws/market/123',
  newsId: '123'
});

// Register for specific message types
useEffect(() => {
  if (!websocket.isConnected) return;
  
  const unregister = websocket.registerForMessageType('price_update', (data) => {
    setPrice(data.price);
  });
  
  return unregister;
}, [websocket.isConnected, websocket.registerForMessageType]);
```

## Message Routing System

Messages are routed based on two criteria:

1. **Message Type**: Using the `message.type` field (e.g., 'market_update', 'balance', etc.)
2. **Field Presence**: For messages that contain specific fields regardless of type

This dual approach ensures flexibility in handling different message formats from the server while maintaining a clean, predictable API.

## Backward Compatibility

The system maintains backward compatibility with existing code:

- `registerBalanceHandler` still works but now uses the new message type system internally
- Components can continue to use `onMessage` callback in `useWebSocketConnection` if needed
- The legacy balance message handling is preserved internally

## Connection Sharing

Multiple components subscribing to the same WebSocket endpoint will share a single connection, significantly reducing server load and browser resource usage. Each component can register for just the message types it needs, creating a more efficient message distribution system.

## Implementation in Components

Components have been updated to use the new message type registration system:

1. **UserContext**: Registers for balance and user update messages
2. **NewsDetail**: Registers for position updates related to the current article
3. **TradingPanel**: Registers for market updates, trade executions, and order book updates

## Benefits

- **Reduced Connection Overhead**: Fewer connections to manage
- **Better Code Organization**: Message handling logic is closer to where it's used
- **Type Safety**: Message handling is more explicit and less error-prone
- **Improved Performance**: Messages are only processed by components that need them
- **Easier Debugging**: Clear separation of message types makes issues easier to track down
- **More Maintainable**: Adding new message types doesn't require changes to the core system

## Further Improvements

Potential future enhancements:

1. Convert to TypeScript for better type safety
2. Add message validation/schemas for each message type
3. Implement WebSocket interceptors for logging or authentication
4. Add message buffering for offline/reconnection scenarios