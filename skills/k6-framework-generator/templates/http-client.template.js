import http from 'k6/http';
import { Trend, Counter } from 'k6/metrics';
import { activeConfig } from '../../config/test-config.js';
import { HEADERS } from '../../config/constants.js';
import { getCorrelationHeaders } from '../../utils/correlation.js';
import { authManager } from '../../utils/auth.js';
import { logger } from '../../utils/logger.js';

const httpClientDuration = new Trend('custom_http_client_duration', true);
const httpClientErrors = new Counter('custom_http_client_errors');

/**
 * Enterprise HTTP Client Wrapper
 * Centralizes request dispatch, auth tokens, correlation headers, and metrics.
 */
export class HttpClient {
  constructor(baseUrl = activeConfig.baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  resolveUrl(endpoint) {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  buildHeaders(customHeaders = {}) {
    const defaultHeaders = {
      'Content-Type': HEADERS.CONTENT_TYPE_JSON,
      'Accept': HEADERS.ACCEPT_JSON,
      'User-Agent': HEADERS.USER_AGENT_HEADER,
    };

    const tracedHeaders = getCorrelationHeaders(defaultHeaders);
    const authedHeaders = authManager.getAuthHeaders(tracedHeaders);
    return Object.assign({}, authedHeaders, customHeaders);
  }

  request(method, endpoint, body = null, params = {}) {
    const url = this.resolveUrl(endpoint);
    const headers = this.buildHeaders(params.headers || {});
    const requestParams = Object.assign({}, params, {
      headers,
      timeout: params.timeout || activeConfig.timeout || '15s',
      tags: Object.assign({ endpoint, method }, params.tags || {}),
    });

    let payload = body;
    if (body !== null && typeof body === 'object') {
      payload = JSON.stringify(body);
    }

    logger.debug(`[HTTP OUT] ${method} ${url}`, { hasBody: Boolean(payload) });

    const startTime = Date.now();
    let response;

    switch (method.toUpperCase()) {
      case 'GET': response = http.get(url, requestParams); break;
      case 'POST': response = http.post(url, payload, requestParams); break;
      case 'PUT': response = http.put(url, payload, requestParams); break;
      case 'PATCH': response = http.patch(url, payload, requestParams); break;
      case 'DELETE': response = http.del(url, payload, requestParams); break;
      default: throw new Error(`Unsupported method: ${method}`);
    }

    const elapsed = Date.now() - startTime;
    httpClientDuration.add(elapsed, { endpoint, method });

    if (response.status >= 400) {
      httpClientErrors.add(1, { endpoint, method, status: response.status });
      logger.warn(`[HTTP ERR] ${method} ${url} -> ${response.status} (${elapsed}ms)`);
    }

    return response;
  }

  get(endpoint, params = {}) { return this.request('GET', endpoint, null, params); }
  post(endpoint, body, params = {}) { return this.request('POST', endpoint, body, params); }
  put(endpoint, body, params = {}) { return this.request('PUT', endpoint, body, params); }
  patch(endpoint, body, params = {}) { return this.request('PATCH', endpoint, body, params); }
  del(endpoint, params = {}) { return this.request('DELETE', endpoint, null, params); }
}

export const defaultHttpClient = new HttpClient();
export default defaultHttpClient;
