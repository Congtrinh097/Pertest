import httpClient from './http-client.js';
import { activeConfig } from '../../config/test-config.js';
import { authManager } from '../../utils/auth.js';
import { checkStatus, checkJsonBody } from '../../utils/checks.js';
import { logger } from '../../utils/logger.js';

/**
 * Authentication Service Template
 */
export class AuthApi {
  constructor(client = httpClient, config = activeConfig) {
    this.client = client;
    this.config = config;
    const isMock = Boolean(this.config.mockMode);
    
    // Configurable endpoint paths
    this.endpoints = {
      login: this.config.auth?.loginEndpoint || (isMock ? '/auth/login' : '/api/v1/auth/login'),
      refresh: isMock ? '/auth/refresh' : '/api/v1/auth/refresh',
      logout: isMock ? '/auth/me' : '/api/v1/auth/logout',
      profile: isMock ? '/auth/me' : '/api/v1/auth/me',
    };
  }

  login(username = this.config.auth?.defaultUsername, password = this.config.auth?.defaultPassword) {
    if (this.config.auth?.directToken) {
      logger.info(`Using direct AUTH_TOKEN override for VU ${__VU}`);
      authManager.setToken(this.config.auth.directToken, { username });
      return { success: true, token: this.config.auth.directToken, response: null };
    }

    const payload = {
      username,
      password,
    };

    const response = this.client.post(this.endpoints.login, payload, {
      tags: { action: 'auth_login' },
    });

    const isOk = checkStatus(response, [200, 201], 'auth_login');
    let extractedToken = null;

    if (isOk) {
      const { data } = checkJsonBody(response, [], 'auth_login_body');
      if (data) {
        extractedToken = data.token 
          || data.accessToken 
          || (data.data && (data.data.token || data.data.accessToken))
          || `simulated_token_vu${__VU}_${Date.now()}`;
      }
      authManager.setToken(extractedToken, { username });
      return { success: true, token: extractedToken, response };
    }

    return { success: false, token: null, response };
  }

  logout() {
    if (this.config.mockMode) {
      authManager.clear();
      return { status: 200, body: '{"message":"Logged out successfully"}' };
    }
    const response = this.client.post(this.endpoints.logout, {}, { tags: { action: 'auth_logout' } });
    authManager.clear();
    return response;
  }

  getProfile() {
    return this.client.get(this.endpoints.profile, { tags: { action: 'auth_profile' } });
  }
}

export const authApi = new AuthApi();
export default authApi;
