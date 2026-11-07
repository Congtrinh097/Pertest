/**
 * K6 Performance Framework Constants
 * Centralizes HTTP headers, status codes, tags, and common constants.
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

export const HEADERS = {
  CONTENT_TYPE_JSON: 'application/json',
  ACCEPT_JSON: 'application/json',
  AUTHORIZATION_PREFIX: 'Bearer ',
  CORRELATION_ID_HEADER: 'X-Correlation-ID',
  REQUEST_ID_HEADER: 'X-Request-ID',
  USER_AGENT_HEADER: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

export const TAGS = {
  TEST_TYPE: 'test_type',
  SCENARIO: 'scenario',
  ENDPOINT: 'endpoint',
  METHOD: 'method',
  STATUS: 'status',
  ENV: 'environment',
};

export const DEFAULTS = {
  THINK_TIME_MIN_SEC: 1,
  THINK_TIME_MAX_SEC: 3,
  MAX_REDIRECTS: 5,
};
