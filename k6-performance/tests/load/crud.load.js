import { THRESHOLDS } from '../../config/thresholds.js';
import { executeWorkload } from '../../scenarios/workload-dispatcher.js';
import { buildSummaryHandler } from '../../utils/reporter.js';
import { logger } from '../../utils/logger.js';

/**
 * 2. LOAD TEST PROFILE
 * Purpose: Gradually increase to expected normal production load, maintain steady-state,
 *          and measure response time, throughput, and error rates.
 * Executor: ramping-vus
 */

const targetVus = parseInt(__ENV.VUS || '20', 10);
const rampUpTime = __ENV.RAMPUP || '1m';
const steadyTime = __ENV.DURATION || '3m';
const rampDownTime = __ENV.RAMPDOWN || '1m';

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: rampUpTime, target: targetVus },   // Ramp-up to expected normal load
        { duration: steadyTime, target: targetVus },   // Maintain steady-state load
        { duration: rampDownTime, target: 0 },         // Ramp-down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: THRESHOLDS.load,
  tags: {
    test_type: 'load',
  },
};

export function setup() {
  logger.info(`Starting Load Test [Target VUs: ${targetVus}, Steady: ${steadyTime}]...`);
  return { startedAt: Date.now() };
}

export default function () {
  executeWorkload();
}

export function teardown(data) {
  logger.info(`Load Test completed. Elapsed: ${(Date.now() - data.startedAt) / 1000}s`);
}

export const handleSummary = buildSummaryHandler('load', 'Load Test (Normal Peak)');
