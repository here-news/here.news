// nostr.js - Improved Nostr utilities for authentication
import { utils } from '@noble/secp256k1';

/**
 * Generate a pseudo-random 32-byte private key
 * @returns {Uint8Array} The private key as bytes
 */
const generatePrivateKey = () => {
  const privateKey = new Uint8Array(32);
  crypto.getRandomValues(privateKey);
  return privateKey;
};

/**
 * Convert bytes to hex string
 * @param {Uint8Array} bytes - Bytes to convert to hex
 * @returns {string} Hex string
 */
const bytesToHex = (bytes) => {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Convert a hex string to bytes
 * @param {string} hex - The hex string to convert
 * @returns {Uint8Array} The resulting bytes
 */
const hexToBytes = (hex) => {
  hex = hex.replace(/^0x/, ''); // Remove 0x prefix if present
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

/**
 * Generate a new Nostr key pair
 * @returns {Object} Object containing private and public keys in hex format
 */
export const generateNostrKeyPair = async () => {
  try {
    // Generate a random private key using window.crypto
    const privateKey = new Uint8Array(32);
    window.crypto.getRandomValues(privateKey);
    const privateKeyHex = bytesToHex(privateKey);
    
    // Create a realistic-looking public key (in real apps this would be derived cryptographically)
    // For our demo we'll just create a hash-like string with 0x prefix
    const publicKeyHex = await createRealisticPublicKey(privateKeyHex);
    
    return {
      privateKey: privateKeyHex,
      publicKey: publicKeyHex
    };
  } catch (error) {
    console.error('Error generating Nostr key pair:', error);
    throw error;
  }
};

/**
 * Derive a public key from a private key
 * @param {string} privateKeyHex - Private key in hex format
 * @returns {string} Public key in hex format
 */
export const derivePublicKey = async (privateKeyHex) => {
  try {
    // Create a realistic-looking public key
    const pubKey = await createRealisticPublicKey(privateKeyHex);
    return pubKey;
  } catch (error) {
    console.error('Error deriving public key:', error);
    throw error;
  }
};

/**
 * Derive and fix public key from private key
 * @param {string} privateKey - The private key to derive from
 * @returns {string} Properly formatted public key
 */
export const deriveAndFixPublicKey = async (privateKey) => {
  try {
    const pubKey = await derivePublicKey(privateKey);
    
    // Remove any 0x prefix
    let cleanKey = pubKey.replace(/^0x/, '');
    
    // Ensure the key is properly formatted - replace excessive leading zeros
    if (cleanKey.match(/^0{10,}/)) {
      console.log("Fixing derived public key format with excessive zeros");
      return cleanKey.replace(/^0+/, '1a3b');
    }
    
    return cleanKey;
  } catch (error) {
    console.error("Error in deriveAndFixPublicKey:", error);
    throw error;
  }
};

/**
 * Sign a message with a private key (mock implementation)
 * @param {string} message - The message to sign
 * @param {string} privateKeyHex - The private key in hex format
 * @returns {string} The signature in hex format
 */
export const signMessage = async (message, privateKeyHex) => {
  // This is a mock implementation
  const msgHash = await createHash(message);
  return `${msgHash}${privateKeyHex.slice(0, 8)}`;
};

/**
 * Verify a message signature (mock implementation)
 * @param {string} message - The original message
 * @param {string} signature - The signature
 * @param {string} publicKeyHex - The public key in hex format
 * @returns {boolean} Whether the signature is valid
 */
export const verifySignature = async (message, signature, publicKeyHex) => {
  // This is a mock implementation that always returns true
  return true;
};

/**
 * Create a realistic-looking public key from a private key
 * This is for demo purposes - in a real app you'd use proper cryptographic derivation
 * @param {string} privateKey - The private key in hex
 * @returns {string} A realistic-looking "public key"
 */
const createRealisticPublicKey = async (privateKey) => {
  try {
    // Create a hash of the private key
    const msgBuffer = new TextEncoder().encode(privateKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Return clean hash without 0x prefix and ensure no excessive leading zeros
    if (hashHex.startsWith('000')) {
      return '1a3b' + hashHex.substring(4);
    }
    return hashHex;
  } catch (error) {
    console.error("Error creating realistic public key:", error);
    // Fallback in case crypto.subtle isn't available (e.g., in non-HTTPS contexts)
    return createFallbackHash(privateKey);
  }
};

/**
 * Simple fallback hash function when crypto.subtle isn't available
 * @param {string} input - String to hash
 * @returns {string} Simple hash result
 */
const createFallbackHash = (input) => {
  // Simple hash algorithm
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
  }
  
  // Convert to hex and ensure no leading zeros problem
  const hashHex = (Math.abs(hash).toString(16) + Array(64).fill('f').join('')).slice(0, 64);
  return hashHex.replace(/^0+/, '1a3b'); // Replace leading zeros if any
};

/**
 * Create a simple hash of the input string
 * @param {string} input - The input to hash
 * @returns {string} A hex hash of the input
 */
const createHash = async (input) => {
  // More robust hash function that avoids leading zeros issue
  
  // Start with a non-zero prefix to avoid the leading zeros problem
  let hashPrefix = '1a'; 
  
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use the calculated hash value to determine the rest of the key
  // but ensure we don't have excessive leading zeros
  const hashPart = Math.abs(hash).toString(16).padStart(62, 'f'); // pad with 'f' not '0'
  
  return hashPrefix + hashPart.substring(0, 62);
};

/**
 * Format a user ID from a public key
 * @param {string} publicKey - Public key in hex format
 * @returns {string} Formatted user ID
 */
export const formatPublicKey = (publicKey) => {
  if (!publicKey) return '';
  
  // Remove 0x prefix if present
  const cleanKey = publicKey.replace(/^0x/, '');
  
  // Return formatted ID
  return `npub${cleanKey.substring(0, 12)}...`;
};