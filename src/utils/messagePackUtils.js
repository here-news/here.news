/**
 * Utility functions for working with MessagePack data
 */

let msgpack = null;

// Try to load the msgpack library
export const initMessagePack = async () => {
  try {
    const module = await import('@msgpack/msgpack');
    msgpack = module;
    return true;
  } catch (error) {
    console.warn('MessagePack library failed to load:', error);
    return false;
  }
};

/**
 * Encode data to MessagePack format if the library is available
 * @param {any} data - The data to encode
 * @returns {Uint8Array|null} - The encoded data or null if MessagePack is not available
 */
export const encode = (data) => {
  if (msgpack) {
    try {
      return msgpack.encode(data);
    } catch (error) {
      console.error('Error encoding data with MessagePack:', error);
    }
  }
  return null;
};

/**
 * Decode MessagePack data if the library is available
 * @param {Uint8Array} buffer - The buffer to decode
 * @returns {any|null} - The decoded data or null if MessagePack is not available
 */
export const decode = (buffer) => {
  if (msgpack) {
    try {
      return msgpack.decode(buffer);
    } catch (error) {
      console.error('Error decoding data with MessagePack:', error);
    }
  }
  return null;
};

// Initialize MessagePack when this module is imported
initMessagePack();

export default {
  initMessagePack,
  encode,
  decode
};
