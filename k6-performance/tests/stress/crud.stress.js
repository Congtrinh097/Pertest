import { THRESHOLDS } from '../../config/thresholds.js';
import { executeWorkload } from '../../scenarios/workload-dispatcher.js';
import { buildSummaryHandler } from '../../utils/reporter.js';
import { logger } from '../../utils/logger.js';

/**
 * 3. STRESS TEST PROFILE
 * Purpose: Gradually increase load beyond normal capacity to identify performance
 *          degradation and the system's practical capacity ceiling.
 * Executor: ramping-vus
 */

const maxVus = parseInt(__ENV.VUS || '120', 10);
const step1 = Math.round(maxVus * 0.25);
const step2 = Math.round(maxVus * 0.50);
const step3 = Math.round(maxVus * 0.75);

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: step1 },   // Warm-up to normal
        { duration: '2m', target: step2 },   // Step 2: Approaching capacity
        { duration: '2m', target: step3 },   // Step 3: Beyond capacity
        { duration: '2m', target: maxVus },  // Step 4: Heavy stress ceiling
        { duration: '1m', target: 0 },       // Cool-down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: THRESHOLDS.stress,
  tags: {
    test_type: 'stress',
  },
};

export function setup() {
  const targetEnv = (__ENV.ENV || 'dev').toLowerCase();
  if (targetEnv === 'production' || targetEnv === 'prod') {
    throw new Error('SAFETY ERROR: Stress testing is strictly prohibited against PRODUCTION!');
  }
  logger.info(`Starting Stress Test [Peak VUs: ${maxVus}]...`);
  return { startedAt: Date.now() };
}

export default function () {
  executeWorkload();
}

export function teardown(data) {
  logger.info(`Stress Test completed. Elapsed: ${(Date.now() - data.startedAt) / 1000}s`);
}

export const handleSummary = buildSummaryHandler('stress', 'Stress Test (Beyond Capacity)');
