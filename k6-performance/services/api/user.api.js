import httpClient from './http-client.js';
import { activeConfig } from '../../config/test-config.js';
import { cleanupRegistry } from '../../utils/cleanup.js';
import { checkStatus, checkJsonBody } from '../../utils/checks.js';
import { logger } from '../../utils/logger.js';

/**
 * User Resource API Client
 * Manages CRUD operations for User entities.
 */
export class UserApi {
  constructor(client = httpClient, config = activeConfig) {
    this.client = client;
    this.config = config;
    /* PLACEHOLDER: Base path for users endpoint */
    this.baseEndpoint = this.config.endpoints?.users || '/api/v1/users';
  }

  /**
   * Creates a new user.
   * @param {object} userData - User payload from factory
   * @param {boolean} registerForCleanup - Whether to automatically schedule deletion
   * @returns {{ success: boolean, id: string|number, data: any, response: object }}
   */
  createUser(userData, registerForCleanup = true) {
    const createEndpoint = this.config.mockMode ? `${this.baseEndpoint}/add` : this.baseEndpoint;
    const response = this.client.post(createEndpoint, userData, {
      tags: { action: 'user_create' },
    });

    const isSuccess = checkStatus(response, [200, 201], 'user_create');
    let createdId = null;
    let bodyData = null;

    if (isSuccess) {
      const parsed = checkJsonBody(response, [], 'user_create_body');
      bodyData = parsed.data;

      // Extract created ID (supports REST standard, nested data, or mock mode)
      if (this.config.mockMode) {
        createdId = 1;
      } else if (bodyData) {
        createdId = bodyData.id 
          || (bodyData.data && bodyData.data.id)
          || (bodyData.json && bodyData.json.username)
          || userData.username;
      } else {
        createdId = userData.username;
      }

      if (registerForCleanup && createdId && !this.config.mockMode) {
        cleanupRegistry.register('users', createdId, (id) => this.deleteUser(id));
      }
    }

    return {
      success: isSuccess,
      id: createdId,
      data: bodyData,
      response,
    };
  }

  /**
   * Retrieves a user by ID
   */
  getUserById(userId) {
    const endpoint = `${this.baseEndpoint}/${encodeURIComponent(userId)}`;
    const response = this.client.get(endpoint, {
      tags: { action: 'user_get_by_id' },
    });
    return response;
  }

  /**
   * Fetches paginated list of users
   */
  listUsers(page = 1, limit = 20) {
    const endpoint = `${this.baseEndpoint}?page=${page}&limit=${limit}`;
    const response = this.client.get(endpoint, {
      tags: { action: 'user_list' },
    });
    return response;
  }

  /**
   * Updates an existing user
   */
  updateUser(userId, updateData) {
    const endpoint = `${this.baseEndpoint}/${encodeURIComponent(userId)}`;
    const response = this.client.put(endpoint, updateData, {
      tags: { action: 'user_update' },
    });
    return response;
  }

  /**
   * Deletes a user by ID
   */
  deleteUser(userId) {
    const endpoint = `${this.baseEndpoint}/${encodeURIComponent(userId)}`;
    const response = this.client.del(endpoint, {
      tags: { action: 'user_delete' },
    });
    return response;
  }
}

export const userApi = new UserApi();
export default userApi;
