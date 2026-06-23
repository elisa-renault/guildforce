/**
 * Centralized logger for Guildforce
 * - In development: outputs to console
 * - In production: captures silently to logCapture for bug reports
 */

import { getRecentLogs } from './logCapture';

const isDev = import.meta.env.DEV;

// Original console methods (saved before logCapture patches them)
const originalConsoleInfo = console.info.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);
const originalConsoleDebug = console.debug.bind(console);

/**
 * Logger utility - use instead of console.log/error/warn
 */
export const log = {
  /**
   * Debug messages - only shown in development
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      originalConsoleDebug('[DEBUG]', ...args);
    }
  },

  /**
   * Informational messages - only shown in development
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      originalConsoleInfo('[INFO]', ...args);
    }
  },

  /**
   * Warning messages - shown in dev, captured in prod
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      originalConsoleWarn('[WARN]', ...args);
    } else {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Error messages - shown in dev, captured in prod
   */
  error: (...args: unknown[]) => {
    if (isDev) {
      originalConsoleError('[ERROR]', ...args);
    } else {
      console.error('[ERROR]', ...args);
    }
  },
};

export default log;
