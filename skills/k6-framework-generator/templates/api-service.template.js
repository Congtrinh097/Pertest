import httpClient from './http-client.js';
import { activeConfig } from '../../config/test-config.js';
import { cleanupRegistry } from '../../utils/cleanup.js';
import { checkStatus, checkJsonBody } from '../../utils/checks.js';

/**
 * Domain Resource API Client Template
 * Replace {{RESOURCE_NAME}} and {{RESOURCE_PATH}} with detected values.
 */
export class {{RESOURCE_NAME}}Api {
  constructor(client = httpClient, config = activeConfig) {
    this.client = client;
    this.config = config;
    this.baseEndpoint = this.config.endpoints?.{{RESOURCE_KEY}} || '{{RESOURCE_PATH}}';
  }

  create(payload, registerForCleanup = true) {
    const endpoint = this.config.mockMode ? `${this.baseEndpoint}/add` : this.baseEndpoint;
    const response = this.client.post(endpoint, payload, { tags: { action: '{{RESOURCE_KEY}}_create' } });

    const isSuccess = checkStatus(response, [200, 201], '{{RESOURCE_KEY}}_create');
    let createdId = null;

    if (isSuccess) {
      const parsed = checkJsonBody(response, [], '{{RESOURCE_KEY}}_create_body');
      const bodyData = parsed.data;

      if (this.config.mockMode) {
        createdId = 1;
      } else if (bodyData) {
        createdId = bodyData.id || (bodyData.data && bodyData.data.id) || payload.id;
      }

      if (registerForCleanup && createdId && !this.config.mockMode) {
        cleanupRegistry.register('{{RESOURCE_KEY}}', createdId, (id) => this.delete(id));
      }
    }

    return { success: isSuccess, id: createdId, response };
  }

  getById(id) {
    return this.client.get(`${this.baseEndpoint}/${encodeURIComponent(id)}`, {
      tags: { action: '{{RESOURCE_KEY}}_get_by_id' },
    });
  }

  list(page = 1, limit = 20) {
    return this.client.get(`${this.baseEndpoint}?page=${page}&limit=${limit}`, {
      tags: { action: '{{RESOURCE_KEY}}_list' },
    });
  }

  update(id, payload) {
    return this.client.put(`${this.baseEndpoint}/${encodeURIComponent(id)}`, payload, {
      tags: { action: '{{RESOURCE_KEY}}_update' },
    });
  }

  delete(id) {
    return this.client.del(`${this.baseEndpoint}/${encodeURIComponent(id)}`, {
      tags: { action: '{{RESOURCE_KEY}}_delete' },
    });
  }
}

export default {{RESOURCE_NAME}}Api;
