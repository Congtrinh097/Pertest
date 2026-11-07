import { THRESHOLDS } from '../../config/thresholds.js';
import { executeWorkload } from '../../scenarios/workload-dispatcher.js';
import { buildSummaryHandler } from '../../utils/reporter.js';
import { logger } from '../../utils/logger.js';

/**
 * 1. SMOKE TEST PROFILE
 * Purpose: Validate basic functionality and availability.
 * Executor: constant-vus (1-2 VUs for ~1 minute)
 */

const vus = parseInt(__ENV.VUS || '2', 10);
const duration = __ENV.DURATION || __ENV.TEST_DURATION || '1m';

export const options = {
  scenarios: {
    smoke_test: {
      executor: 'constant-vus',
      vus: vus,
      duration: duration,
    },
  },
  thresholds: THRESHOLDS.smoke,
  tags: {
    test_type: 'smoke',
  },
};

export function setup() {
  logger.info(`Starting Smoke Test [VUs: ${vus}, Duration: ${duration}]...`);
  return { startedAt: Date.now() };
}

export default function () {
  executeWorkload();
}

export function teardown(data) {
  logger.info(`Smoke Test completed. Elapsed: ${(Date.now() - data.startedAt) / 1000}s`);
}

export const handleSummary = buildSummaryHandler('smoke', 'Smoke Test (Sanity)');
