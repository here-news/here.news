/**
 * Client-side implementation of the binary message protocol
 * This module handles encoding and decoding of binary messages for the WebSocket connection
 */

/**
 * Protocol message format version
 */
export const PROTOCOL_VERSION = 1;

/**
 * Message categories
 */
export const MessageCategory = {
  MARKET: 'market',
  USER: 'user',
  SYSTEM: 'system',
  HEARTBEAT: 'heartbeat'
};

/**
 * Check if MessagePack is available in the browser
 */
export const hasMessagePack = () => {
  try {
    // Check if MessagePack is globally available
    return typeof window !== 'undefined' && 
           (typeof window.msgpack !== 'undefined' || 
            typeof window.MessagePack !== 'undefined');
  } catch (e) {
    return false;
  }
};

/**
 * Load MessagePack from CDN if not already loaded
 */
export const loadMessagePack = async () => {
  if (hasMessagePack()) {
    return true;
  }
  
  try {
    // Create a script element to load MessagePack from CDN
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@msgpack/msgpack@2.8.0/dist.min.js';
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Failed to load MessagePack'));
      document.head.appendChild(script);
    });
  } catch (e) {
    console.error('Error loading MessagePack:', e);
    return false;
  }
};

/**
 * Decode a binary message using MessagePack or fallback to JSON
 * 
 * @param {ArrayBuffer|string} data - The message data to decode
 * @returns {Object} The decoded message
 */
export const decodeMessage = (data) => {
  // Handle binary data
  if (data instanceof ArrayBuffer || (typeof data === 'object' && data.byteLength !== undefined)) {
    // Convert to Uint8Array for easier handling
    const uint8Array = new Uint8Array(data);
    
    // Check the message format
    if (uint8Array.length > 0) {
      const formatFlag = uint8Array[0];
      
      try {
        // Try to decompress if needed
        if (formatFlag === 1 || formatFlag === 3) {
          // This is a compressed message
          // In browser we need to use pako.js for zlib compression
          if (typeof window.pako !== 'undefined') {
            const compressedData = uint8Array.slice(1);
            const decompressedData = window.pako.inflate(compressedData);
            
            // Format 1 = MessagePack compressed
            if (formatFlag === 1 && hasMessagePack()) {
              return window.msgpack.decode(decompressedData);
            } 
            // Format 3 = JSON compressed
            else if (formatFlag === 3) {
              const jsonString = new TextDecoder().decode(decompressedData);
              return JSON.parse(jsonString);
            }
          } else {
            console.warn('Received compressed message but pako.js is not available');
          }
        } 
        // Uncompressed MessagePack (format flag 0)
        else if (formatFlag === 0 && hasMessagePack()) {
          return window.msgpack.decode(uint8Array.slice(1));
        }
        
        // If MessagePack decoding failed or wasn't applicable, try JSON
        try {
          const jsonString = new TextDecoder().decode(data);
          return JSON.parse(jsonString);
        } catch (e) {
          // Not valid JSON
          console.error('Failed to decode binary message as JSON:', e);
        }
      } catch (e) {
        console.error('Error decoding binary message:', e);
      }
    }
    
    // Return null for undecodable binary messages
    return null;
  }
  
  // Handle text data
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      // Not valid JSON
      return data;
    }
  }
  
  // Default for unknown types
  return data;
};

/**
 * Check if a message is a heartbeat message
 * 
 * @param {Object|string} message - The message to check
 * @returns {boolean} True if the message is a heartbeat
 */
export const isHeartbeat = (message) => {
  // Handle string messages
  if (typeof message === 'string') {
    return message === 'ping' || message === 'pong';
  }
  
  // Handle JSON messages
  if (typeof message === 'object' && message !== null) {
    return (
      message.cat === MessageCategory.HEARTBEAT ||
      message.type === 'ping' ||
      message.type === 'pong'
    );
  }
  
  return false;
};

/**
 * Create a heartbeat message
 * 
 * @returns {string} The heartbeat message
 */
export const createHeartbeat = () => {
  return JSON.stringify({
    v: PROTOCOL_VERSION,
    cat: MessageCategory.HEARTBEAT,
    type: 'ping',
    ts: new Date().toISOString()
  });
};

/**
 * Create a protocol initialization message to negotiate protocol features
 * 
 * @param {string} newsId - Optional news ID for market connections
 * @param {string} userId - Optional user ID for user connections 
 * @returns {string} The protocol initialization message
 */
export const createProtocolInit = (newsId, userId) => {
  // Create a simplified protocol init message to avoid server-side errors
  const message = {
    v: PROTOCOL_VERSION,
    protocol_version: PROTOCOL_VERSION,
    // Only include essential features to reduce complexity
    features: ['json'],
    // Don't announce msgpack support to avoid potential issues
    supports_msgpack: false,
    ts: new Date().toISOString(),
    client: 'web'
  };
  
  // Only include these fields if they're valid non-empty strings
  if (newsId && typeof newsId === 'string' && newsId.length > 0) {
    message.news_id = newsId;
  }
  
  if (userId && typeof userId === 'string' && userId.length > 0) {
    // Use public_key instead of user_id to match server expectations
    message.public_key = userId;
  }
  
  try {
    return JSON.stringify(message);
  } catch (e) {
    console.error('Error creating protocol init message:', e);
    // Return a minimal fallback message if JSON stringify fails
    return JSON.stringify({ 
      v: PROTOCOL_VERSION,
      type: 'init'
    });
  }
};

export default {
  PROTOCOL_VERSION,
  MessageCategory,
  hasMessagePack,
  loadMessagePack,
  decodeMessage,
  isHeartbeat,
  createHeartbeat,
  createProtocolInit
};