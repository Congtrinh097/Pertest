import { THRESHOLDS } from '../../config/thresholds.js';
import { executeWorkload } from '../../scenarios/workload-dispatcher.js';
import { buildSummaryHandler } from '../../utils/reporter.js';
import { logger } from '../../utils/logger.js';

/**
 * 6. BREAKPOINT TEST PROFILE
 * Purpose: Increase load in controlled steps to identify the point where the system violates
 *          defined SLOs. Employs abortOnFail safety thresholds to automatically stop testing.
 * Executor: ramping-arrival-rate
 */

const startRate = parseInt(__ENV.BREAKPOINT_START_RATE || '10', 10);
const maxRate = parseInt(__ENV.BREAKPOINT_MAX_RATE || '250', 10);
const maxVus = parseInt(__ENV.VUS || '300', 10);

export const options = {
  scenarios: {
    breakpoint_test: {
      executor: 'ramping-arrival-rate',
      startRate: startRate,
      timeUnit: '1s',
      preAllocatedVUs: 30,
      maxVUs: maxVus,
      stages: [
        { duration: '1m', target: 20 },   // Step 1: 20 req/s
        { duration: '2m', target: 50 },   // Step 2: 50 req/s
        { duration: '2m', target: 100 },  // Step 3: 100 req/s
        { duration: '2m', target: 150 },  // Step 4: 150 req/s
        { duration: '2m', target: 200 },  // Step 5: 200 req/s
        { duration: '2m', target: maxRate }, // Step 6: Maximum capacity threshold
        { duration: '1m', target: 0 },    // Cool-down
      ],
    },
  },
  thresholds: THRESHOLDS.breakpoint,
  tags: {
    test_type: 'breakpoint',
  },
};

export function setup() {
  const targetEnv = (__ENV.ENV || 'dev').toLowerCase();
  if (targetEnv === 'production' || targetEnv === 'prod') {
    throw new Error('SAFETY ERROR: Breakpoint testing is strictly prohibited against PRODUCTION!');
  }
  logger.info(`Starting Breakpoint Test [Stepped up to ${maxRate} req/s, Safety Abort Enabled]...`);
  return { startedAt: Date.now() };
}

export default function () {
  executeWorkload();
}

export function teardown(data) {
  logger.info(`Breakpoint Test completed. Elapsed: ${(Date.now() - data.startedAt) / 1000}s`);
}

export const handleSummary = buildSummaryHandler('breakpoint', 'Breakpoint Test (Capacity Discovery)');
