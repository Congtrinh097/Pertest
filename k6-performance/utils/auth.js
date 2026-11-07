import { HEADERS } from '../config/constants.js';
import { activeConfig } from '../config/test-config.js';
import { logger } from './logger.js';

/**
 * VU-Level Authentication State Manager.
 * In k6, each Virtual User (VU) executes in an isolated JavaScript runtime.
 * Module-level state is per-VU and not shared across VUs.
 */

let vuAuthToken = activeConfig.auth?.directToken || null;
let vuAuthUser = null;

export const authManager = {
  /**
   * Sets the current VU's active JWT or bearer token.
   */
  setToken: (token, user = null) => {
    vuAuthToken = token;
    vuAuthUser = user;
    logger.debug(`Auth token set for VU ${__VU}`);
  },

  /**
   * Retrieves the current VU's token.
   */
  getToken: () => vuAuthToken || activeConfig.auth?.directToken,

  /**
   * Returns current user context if available.
   */
  getUser: () => vuAuthUser,

  /**
   * Checks if current VU has an active token.
   */
  isAuthenticated: () => Boolean(vuAuthToken || activeConfig.auth?.directToken),

  /**
   * Clears the current VU token.
   */
  clear: () => {
    vuAuthToken = null;
    vuAuthUser = null;
  },

  /**
   * Builds Authorization headers for HTTP requests.
   */
  getAuthHeaders: (customHeaders = {}) => {
    const headers = Object.assign({}, customHeaders);
    const token = vuAuthToken || activeConfig.auth?.directToken;
    if (token) {
      headers['Authorization'] = `${HEADERS.AUTHORIZATION_PREFIX}${token}`;
    }
    return headers;
  },
};

export default authManager;
