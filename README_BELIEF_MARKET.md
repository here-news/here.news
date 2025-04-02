# Belief Market Integration Guide

This document provides instructions for client applications to update their systems to work with the new belief market implementation. The belief market is a new trading model that replaces the traditional long/short positions with YES/NO positions.

## Overview of Belief Market

In the belief market model:
- Users can buy or sell YES and NO positions
- Prices are derived from a belief ratio
- YES price = belief_ratio * max_price
- NO price = (1 - belief_ratio) * max_price
- The sum of YES and NO prices always equals max_price (typically 0.10)

## Client Application Migration Steps

### 1. Update Data Models

#### Market State Model
```typescript
interface MarketState {
  news_id: string;
  
  // Belief market core data
  belief_ratio: number;      // Ratio between 0.01-0.99
  yes_price: number;         // Price of YES shares
  no_price: number;          // Price of NO shares
  max_price: number;         // Fixed constant (yes_price + no_price = max_price)
  
  // For backward compatibility
  current_price: number;     // Same as yes_price
  last_price: number;        // Same as yes_price
  
  // Market statistics
  volume_yes: number;        // Trading volume for YES side
  volume_no: number;         // Trading volume for NO side
  total_volume: number;      // Total trading volume in dollars
  user_count: number;        // Number of users trading this market
  
  // Last trades and prices
  last_trade_price: number;  // Price of last trade
  last_trade_side: string;   // Side of last trade (YES or NO)
  
  // Additional stats
  market_cap: number;
  trading_volume_24h: number;
  price_change_24h: number;
}
```

#### Position Model
```typescript
interface Position {
  yes_shares: number;       // Number of YES shares
  no_shares: number;        // Number of NO shares
  yes_avg_price: number;    // Average price of YES shares
  no_avg_price: number;     // Average price of NO shares
}
```

#### User Balance Model
```typescript
interface UserBalance {
  user_id: string;
  quote_balance: number;                // Cash balance
  positions: Record<string, Position>;  // News_id -> Position mapping
  updated_at: string;                   // ISO datetime
}
```

#### Trade Model
```typescript
interface Trade {
  trade_id: string;
  news_id: string;
  user_id: string;
  side: string;            // "YES" or "NO"
  type: string;            // "BUY" or "SELL"
  price: number;
  shares: number;
  is_amm: boolean;         // Whether the trade was with AMM
  executed_at: string;     // ISO datetime
}
```

### 2. API Endpoint Updates

#### New Belief Market Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/belief-market/{news_id}/state` | Get market state for a news item |
| GET | `/belief-market/{news_id}/position` | Get user's position for a news item |
| GET | `/belief-market/{news_id}/trades` | Get recent trades for a market |
| POST | `/belief-market/{news_id}/trade` | Execute a trade (buy or sell) |
| POST | `/belief-market/{news_id}/buy` | Buy shares at market price |
| POST | `/belief-market/{news_id}/sell` | Sell shares at market price |
| POST | `/belief-market/{news_id}/limit` | Place a limit order |

#### Legacy Endpoints (Still Work)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/market/{news_id}/state` | Get market state (now includes belief market fields) |
| GET | `/market/{news_id}/position` | Get user's position (now returns Position object) |
| GET | `/me/balance` | Get user balance (now includes positions object) |
| POST | `/market/{news_id}/buy` | Buy shares (works with new belief market system) |
| POST | `/market/{news_id}/sell` | Sell shares (works with new belief market system) |

### 3. Request/Response Format Changes

#### Trading Requests

**New Format (for `/belief-market/{news_id}/trade`)**
```json
{
  "side": "YES",       // "YES" or "NO"
  "type": "BUY",       // "BUY" or "SELL"
  "amount": 1.0        // Amount in currency (for buy) or shares (for sell)
}
```

**Legacy Format (still supported)**
```json
{
  "volume": 10,        // Number of shares
  "price": 0.05        // Price per share
}
```

#### Market State Response

The market state now includes belief market fields:
```json
{
  "news_id": "abc123",
  "belief_ratio": 0.5,
  "yes_price": 0.05,
  "no_price": 0.05,
  "max_price": 0.1,
  "current_price": 0.05,      // Same as yes_price for backward compatibility
  "volume_yes": 100.0,
  "volume_no": 50.0,
  "total_volume": 150.0,
  "user_count": 10,
  "last_trade_price": 0.05,
  "last_trade_side": "YES"
}
```

#### Position Response

Positions now include both YES and NO shares:
```json
{
  "yes_shares": 100.0,
  "no_shares": 50.0,
  "yes_avg_price": 0.045,
  "no_avg_price": 0.055
}
```

### 4. WebSocket Updates

#### Message Types

The WebSocket system now sends these message types:

| Type | Description |
|------|-------------|
| `market` | Market state update |
| `trade` | New trade in a market |
| `order_book` | Order book update |
| `balance` | User balance update |
| `position` | User position update |

#### Trade Message Format

Trade messages now include `side` and `shares` fields:
```json
{
  "type": "trade",
  "news_id": "abc123",
  "data": {
    "trade_id": "xyz789",
    "user_id": "user123",
    "side": "YES",          // "YES" or "NO"
    "type": "BUY",          // "BUY" or "SELL"
    "shares": 10.0,         // Number of shares
    "price": 0.05,
    "is_amm": true,
    "executed_at": "2025-01-01T00:00:00Z"
  }
}
```

#### Market Message Format

Market messages now include belief market fields:
```json
{
  "type": "market",
  "news_id": "abc123",
  "data": {
    "belief_ratio": 0.5,
    "yes_price": 0.05,
    "no_price": 0.05,
    "max_price": 0.1,
    "current_price": 0.05,  // Same as yes_price
    "volume_yes": 100.0,
    "volume_no": 50.0
  }
}
```

### 5. Client Implementation Recommendations

#### Trading Implementation

1. **For new clients:**
   - Use the `/belief-market/{news_id}/trade` endpoint for all trades
   - Specify `side` ("YES" or "NO") and `type` ("BUY" or "SELL")
   - For market orders, provide `amount` in currency for buy orders or in shares for sell orders

2. **For existing clients:**
   - You can continue to use `/market/{news_id}/buy` and `/market/{news_id}/sell`
   - The system automatically treats these as YES side trades
   - However, this doesn't allow trading NO positions

#### Position Display

1. Display both YES and NO positions separately
2. Total position value = (yes_shares * yes_price) + (no_shares * no_price)
3. Profit/Loss calculation:
   - YES P&L = yes_shares * (current_yes_price - yes_avg_price)
   - NO P&L = no_shares * (current_no_price - no_avg_price)
   - Total P&L = YES P&L + NO P&L

#### Market Price Display

1. Show both YES and NO prices
2. Consider displaying the belief ratio (probability) as a percentage
3. For backward compatibility, use yes_price as the main price

### 6. Migration Strategy

1. **Phased Approach:**
   - Start by updating your market state model to include new fields
   - Update position display to show YES/NO positions
   - Finally, update trading UI to support YES/NO trading

2. **Backward Compatibility:**
   - All legacy endpoints continue to work
   - Legacy endpoints map to YES trades by default
   - Legacy data models include new fields with sensible defaults

3. **Testing:**
   - Use the test client at `/tests/websocket/belief_market_test.html`
   - Verify positions update correctly after trades
   - Check that WebSocket updates work properly

### 7. Example Code

#### Trading Example

```javascript
// Trading YES shares
async function buyYesShares(newsId, amount) {
  const response = await fetch(`/belief-market/${newsId}/trade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      side: 'YES',
      type: 'BUY',
      amount: amount  // in dollars
    })
  });
  return await response.json();
}

// Trading NO shares
async function buyNoShares(newsId, amount) {
  const response = await fetch(`/belief-market/${newsId}/trade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      side: 'NO',
      type: 'BUY',
      amount: amount  // in dollars
    })
  });
  return await response.json();
}
```

#### WebSocket Example

```javascript
// Connect to market WebSocket
const marketSocket = new WebSocket(`ws://localhost:8282/ws/market/${newsId}`);

marketSocket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'market') {
    // Update market display
    updateMarketDisplay(message.data);
  } else if (message.type === 'trade') {
    // Handle new trade
    addTradeToHistory(message.data);
  } else if (message.type === 'batch') {
    // Handle batched messages
    handleBatchMessages(message.data);
  }
};

// Connect to user WebSocket
const userSocket = new WebSocket(`ws://localhost:8282/ws/user/${userId}`);

userSocket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'balance') {
    // Update user balance
    updateUserBalance(message.data);
  } else if (message.type === 'position') {
    // Update position display
    updatePositionDisplay(message.data);
  }
};
```

### 8. Troubleshooting

1. **Missing Fields in Responses**
   - Ensure you're using the latest version of the API
   - Legacy fields like `current_price` are still available for backward compatibility

2. **WebSocket Connection Issues**
   - WebSocket URLs haven't changed: `/ws/market/{news_id}` and `/ws/user/{user_id}`
   - Make sure to handle both the new message formats and legacy formats

3. **Trade Execution Problems**
   - Check that you're sending the correct fields (`side`, `type`, `amount`)
   - For market orders, amount is in currency for BUY and in shares for SELL

### 9. Support

For any issues with the belief market integration, contact the API team or refer to the complete API documentation.