/**
 * Debug configuration and utilities for the application
 */

// Set to true for development debugging, false for production
export const DEBUG_MODE = false;

/**
 * Debug logger that only logs if DEBUG_MODE is enabled
 * @param {...any} args - Arguments to log
 */
export const debugLog = (...args) => {
    if (DEBUG_MODE) console.log(...args);
};
