const getFaviconUrl = (url, size=32) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
    } catch (error) {
      console.error('Invalid URL:', error);
      return '/path/to/default/favicon.ico';
    }
  };

/**
 * Shortens a public key for display purposes
 * @param {string} publicKey - The public key to shorten
 * @param {number} startChars - Number of characters to keep at the beginning
 * @param {number} endChars - Number of characters to keep at the end
 * @returns {string} Shortened public key
 */
export const shortenPublicKey = (publicKey, startChars = 6, endChars = 4) => {
  if (!publicKey || typeof publicKey !== 'string') {
    return '';
  }
  
  // Remove 0x prefix if it exists
  let processedKey = publicKey.replace(/^0x/, '');
  
  // Handle keys with excessive leading zeros
  if (processedKey.match(/^0{10,}/)) {
    // Replace excessive leading zeros with a shorter prefix
    processedKey = processedKey.replace(/^0+/, '1a');
    console.log('Reformatted key for display:', processedKey);
  }
  
  // For very long keys, use a more aggressive shortening
  if (processedKey.length > 30) {
    // Take first N chars and last N chars
    return `${processedKey.slice(0, startChars)}...${processedKey.slice(-endChars)}`;
  }
  
  // Normal case for reasonable length keys
  if (processedKey.length <= startChars + endChars + 3) {
    return processedKey;
  }
  
  return `${processedKey.slice(0, startChars)}...${processedKey.slice(-endChars)}`;
};

export default getFaviconUrl;