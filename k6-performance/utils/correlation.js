import { generateUUID } from './random.js';

/**
 * Correlation and Request Tracing Utilities
 * Injects tracing headers to correlate k6 synthetic requests with backend APM / logs.
 */

export function generateCorrelationId() {
  const vu = typeof __VU !== 'undefined' ? __VU : 0;
  const iter = typeof __ITER !== 'undefined' ? __ITER : 0;
  return `k6-vu${vu}-it${iter}-${generateUUID()}`;
}

export function getCorrelationHeaders(customHeaders = {}) {
  const correlationId = generateCorrelationId();
  return Object.assign(
    {
      'X-Correlation-ID': correlationId,
      'X-Request-ID': correlationId,
    },
    customHeaders
  );
}
