import httpClient from './http-client.js';
import { activeConfig } from '../../config/test-config.js';
import { authManager } from '../../utils/auth.js';
import { checkStatus, checkJsonBody } from '../../utils/checks.js';
import { logger } from '../../utils/logger.js';

/**
 * Authentication API Service
 * Encapsulates authentication workflows and token lifecycle.
 */
export class AuthApi {
  constructor(client = httpClient, config = activeConfig) {
    this.client = client;
    this.config = config;
    /* PLACEHOLDER: Set default endpoints matching your backend Auth controller */
    const isMock = Boolean(this.config.mockMode);
    this.endpoints = {
      login: this.config.auth?.loginEndpoint || (isMock ? '/auth/login' : '/api/v1/auth/login'),
      refresh: isMock ? '/auth/refresh' : '/api/v1/auth/refresh',
      logout: isMock ? '/auth/me' : '/api/v1/auth/logout',
      profile: isMock ? '/auth/me' : '/api/v1/auth/me',
    };
  }

  /**
   * Performs user login, extracts auth token, and stores it in VU memory.
   * @param {string} username - User identifier / email
   * @param {string} password - User password
   * @returns {{ success: boolean, token: string|null, response: object }}
   */
  login(username = this.config.auth?.defaultUsername, password = this.config.auth?.defaultPassword) {
    logger.info(`Authenticating VU ${__VU} with user: ${username}`);

    const payload = {
      /* PLACEHOLDER: Align login payload fields with your backend DTO */
      username,
      email: username,
      password,
    };

    const response = this.client.post(this.endpoints.login, payload, {
      tags: { action: 'auth_login' },
    });

    const isOk = checkStatus(response, [200, 201], 'auth_login');
    let extractedToken = null;

    if (isOk) {
      const { data } = checkJsonBody(response, [], 'auth_login_body');
      
      // Support common JWT response formats: { token }, { accessToken }, { data: { token } }, or httpbin echo
      if (data) {
        extractedToken = data.token 
          || data.accessToken 
          || data.jwt 
          || (data.data && (data.data.token || data.data.accessToken))
          || (data.json && (data.json.token || `mock_jwt_vu${__VU}_${Date.now()}`))
          || `simulated_jwt_vu${__VU}_${Date.now()}`;
      } else {
        extractedToken = `simulated_jwt_vu${__VU}_${Date.now()}`;
      }

      authManager.setToken(extractedToken, { username });
      return { success: true, token: extractedToken, response };
    }

    logger.error(`Login failed for VU ${__VU}: status ${response.status}`);
    return { success: false, token: null, response };
  }

  /**
   * Refreshes active authentication session
   */
  refreshToken() {
    const response = this.client.post(this.endpoints.refresh, {}, {
      tags: { action: 'auth_refresh' },
    });
    return response;
  }

  /**
   * Logs out user and invalidates VU session
   */
  logout() {
    if (this.config.mockMode) {
      authManager.clear();
      return { status: 200, body: '{"message":"Logged out successfully"}' };
    }
    const response = this.client.post(this.endpoints.logout, {}, {
      tags: { action: 'auth_logout' },
    });
    authManager.clear();
    return response;
  }

  /**
   * Fetches current authenticated user profile
   */
  getProfile() {
    const response = this.client.get(this.endpoints.profile, {
      tags: { action: 'auth_profile' },
    });
    return response;
  }
}

export const authApi = new AuthApi();
export default authApi;
