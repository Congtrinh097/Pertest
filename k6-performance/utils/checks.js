import { check } from 'k6';
import { logger } from './logger.js';

/**
 * Standardized Response Validation and Assertion Utilities.
 */

/**
 * Validates HTTP response status and basic expectations.
 * @param {object} response - The k6 HTTP response object.
 * @param {number|number[]} expectedStatus - Expected status code or array of valid codes.
 * @param {string} actionName - Descriptive label of the operation.
 * @returns {boolean} True if all checks passed.
 */
export function checkStatus(response, expectedStatus, actionName = 'request') {
  const validStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  
  const passed = check(response, {
    [`${actionName}: status is ${validStatuses.join(' or ')}`]: (res) => validStatuses.includes(res.status),
  });

  if (!passed) {
    logger.error(`Validation failed for ${actionName}`, {
      status: response.status,
      expected: validStatuses,
      body: response.body ? response.body.substring(0, 300) : '<empty>',
      url: response.url,
    });
  }

  return passed;
}

/**
 * Safely parses response body as JSON and validates required properties.
 * @param {object} response - k6 HTTP response.
 * @param {string[]} requiredFields - List of mandatory top-level or nested keys.
 * @param {string} actionName - Action label.
 * @returns {{ success: boolean, data: any }}
 */
export function checkJsonBody(response, requiredFields = [], actionName = 'parse_json') {
  let parsed = null;
  let isValidJson = false;

  try {
    parsed = response.json();
    isValidJson = parsed !== null && typeof parsed === 'object';
  } catch (err) {
    logger.error(`Failed to parse JSON for ${actionName}`, { error: err.message, body: response.body });
    check(response, { [`${actionName}: response is valid JSON`]: () => false });
    return { success: false, data: null };
  }

  const checks = {
    [`${actionName}: body is valid JSON`]: () => isValidJson,
  };

  for (const field of requiredFields) {
    checks[`${actionName}: contains property '${field}'`] = () => {
      // In httpbin/mock mode, fields may be nested under 'json' or top level
      if (parsed[field] !== undefined) return true;
      if (parsed.json && parsed.json[field] !== undefined) return true;
      if (parsed.data && parsed.data[field] !== undefined) return true;
      return false;
    };
  }

  const success = check(response, checks);
  return { success, data: parsed };
}

/**
 * Checks response time against an SLA ceiling.
 */
export function checkResponseTime(response, maxDurationMs, actionName = 'latency_check') {
  return check(response, {
    [`${actionName}: response time <= ${maxDurationMs}ms`]: (res) => res.timings.duration <= maxDurationMs,
  });
}
