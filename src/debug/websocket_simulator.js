/**
 * WebSocket Simulator
 * 
 * This script helps simulate WebSocket behavior for testing without an actual backend.
 * It mocks typical WebSocket messages that would be sent by the server.
 * 
 * Usage (in Developer Console):
 * 1. First, import this script in your page or paste it in the Developer Console
 * 2. Call startWsSimulation() to begin simulation
 * 3. Call stopWsSimulation() to stop
 */

// Storage for simulation interval and state
const wsSimulator = {
  interval: null,
  running: false,
  messageCount: 0,
  positions: {}
};

// Sample news IDs to simulate position updates
const sampleNewsIds = [
  'a1b2c3d4e5f6g7h8i9j0',
  'b2c3d4e5f6g7h8i9j0k1',
  'c3d4e5f6g7h8i9j0k1l2'
];

// Start WebSocket simulation
function startWsSimulation() {
  if (wsSimulator.running) {
    console.log('WebSocket simulation already running');
    return;
  }
  
  console.log('Starting WebSocket simulation...');
  wsSimulator.running = true;
  
  // Create initial positions
  sampleNewsIds.forEach(newsId => {
    wsSimulator.positions[newsId] = {
      long_shares: Math.floor(Math.random() * 10) + 1,
      short_shares: Math.floor(Math.random() * 5),
      entry_price_long: (Math.random() * 0.10 + 0.05).toFixed(4),
      entry_price_short: (Math.random() * 0.10 + 0.05).toFixed(4)
    };
  });
  
  // Send a connection event
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('websocket_connected', {
      detail: { 
        connectionTime: 230,
        url: 'ws://localhost:8282/ws/user/***'
      }
    }));
  }, 500);
  
  // Start sending messages at random intervals
  wsSimulator.interval = setInterval(() => {
    if (!wsSimulator.running) {
      clearInterval(wsSimulator.interval);
      return;
    }
    
    // Increment message counter
    wsSimulator.messageCount++;
    
    // Decide what type of message to send
    const messageType = Math.random();
    
    if (messageType < 0.3) {
      // 30% chance: Send a heartbeat
      console.log('Simulating heartbeat message');
      
      // No need to trigger any events for heartbeats
    } 
    else if (messageType < 0.8) {
      // 50% chance: Send a position update
      const randomNewsId = sampleNewsIds[Math.floor(Math.random() * sampleNewsIds.length)];
      
      // Randomly adjust position values
      const newsPos = wsSimulator.positions[randomNewsId];
      if (Math.random() > 0.5) {
        newsPos.long_shares += Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
        newsPos.long_shares = Math.max(0, newsPos.long_shares);
      } else {
        newsPos.short_shares += Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
        newsPos.short_shares = Math.max(0, newsPos.short_shares);
      }
      
      console.log(`Simulating position update for news ID: ${randomNewsId}`);
      
      // Create position update event
      const positions = [];
      
      if (newsPos.long_shares > 0) {
        positions.push({
          id: `long-${randomNewsId}-${Date.now()}`,
          news_id: randomNewsId,
          position_type: 'long',
          shares: newsPos.long_shares,
          price: parseFloat(newsPos.entry_price_long),
          created_at: new Date().toISOString()
        });
      }
      
      if (newsPos.short_shares > 0) {
        positions.push({
          id: `short-${randomNewsId}-${Date.now()}`,
          news_id: randomNewsId,
          position_type: 'short',
          shares: newsPos.short_shares,
          price: parseFloat(newsPos.entry_price_short),
          created_at: new Date().toISOString()
        });
      }
      
      // Dispatch custom event with the position data
      const positionUpdateEvent = new CustomEvent('positionUpdate', {
        detail: {
          newsId: randomNewsId,
          positions: positions
        }
      });
      window.dispatchEvent(positionUpdateEvent);
      
      // Also trigger websocket message event
      window.dispatchEvent(new CustomEvent('websocket_message'));
    } 
    else {
      // 20% chance: Send a balance update
      const newBalance = 1000 + Math.random() * 2000;
      console.log(`Simulating balance update: $${newBalance.toFixed(2)}`);
      
      // Trigger websocket message event
      window.dispatchEvent(new CustomEvent('websocket_message'));
    }
    
  }, 3000 + Math.random() * 7000); // Random interval between 3-10 seconds
  
  return 'WebSocket simulation started. Call stopWsSimulation() to stop.';
}

// Stop WebSocket simulation
function stopWsSimulation() {
  if (!wsSimulator.running) {
    console.log('WebSocket simulation not running');
    return;
  }
  
  console.log('Stopping WebSocket simulation...');
  wsSimulator.running = false;
  clearInterval(wsSimulator.interval);
  
  // Simulate a connection close
  window.dispatchEvent(new CustomEvent('websocket_closed', {
    detail: { 
      code: 1000,
      reason: 'Simulation stopped',
      isClean: true,
      failedAttempts: 0
    }
  }));
  
  return `WebSocket simulation stopped. Sent ${wsSimulator.messageCount} messages.`;
}

// Export functions for use in the console
window.startWsSimulation = startWsSimulation;
window.stopWsSimulation = stopWsSimulation;

console.log('WebSocket simulator loaded. Call startWsSimulation() to begin testing.');