// nostr.js - Simplified Nostr utilities for authentication
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
    // Generate a random private key
    const privateKey = generatePrivateKey();
    const privateKeyHex = bytesToHex(privateKey);
    
    // Generate a deterministic "public key" from the private key
    // This is a mock implementation for demonstration purposes
    const publicKeyHex = await mockDerivePublicKey(privateKeyHex);
    
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
    // This is a simplified mock implementation that would normally use secp256k1
    return await mockDerivePublicKey(privateKeyHex);
  } catch (error) {
    console.error('Error deriving public key:', error);
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
 * A mock implementation that creates deterministic public keys from private keys
 * This is only for demonstration - not cryptographically secure
 * @param {string} privateKey - The private key in hex
 * @returns {string} A deterministic "public key" based on the private key
 */
const mockDerivePublicKey = async (privateKey) => {
  // Create a simple hash of the private key
  const hash = await createHash(privateKey);
  return hash;
};

/**
 * Create a simple hash of the input string
 * @param {string} input - The input to hash
 * @returns {string} A hex hash of the input
 */
const createHash = async (input) => {
  // Simple hash function for demonstration
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Create a hex string based on the hash
  return Math.abs(hash).toString(16).padStart(64, '0');
};

/**
 * Format a user ID from a public key
 * @param {string} publicKey - Public key in hex format
 * @returns {string} Formatted user ID (npub...)
 */
export const formatPublicKey = (publicKey) => {
  if (!publicKey) return '';
  // Simple implementation - in a real app you'd use bech32 encoding
  return `npub${publicKey.substring(0, 12)}...`;
};