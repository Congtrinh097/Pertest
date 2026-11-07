import { THRESHOLDS } from '../../config/thresholds.js';
import { executeWorkload } from '../../scenarios/workload-dispatcher.js';
import { buildSummaryHandler } from '../../utils/reporter.js';
import { logger } from '../../utils/logger.js';

/**
 * 5. SOAK / ENDURANCE TEST PROFILE
 * Purpose: Maintain steady load for an extended period to identify memory leaks,
 *          database connection exhaustion, and gradual degradation.
 * Executor: constant-vus
 */

const vus = parseInt(__ENV.VUS || '25', 10);
const duration = __ENV.SOAK_DURATION || __ENV.DURATION || '20m';

export const options = {
  scenarios: {
    soak_test: {
      executor: 'constant-vus',
      vus: vus,
      duration: duration,
      gracefulStop: '1m',
    },
  },
  thresholds: THRESHOLDS.soak,
  tags: {
    test_type: 'soak',
  },
};

export function setup() {
  const targetEnv = (__ENV.ENV || 'dev').toLowerCase();
  if (targetEnv === 'production' || targetEnv === 'prod') {
    throw new Error('SAFETY ERROR: Soak testing is strictly prohibited against PRODUCTION!');
  }
  logger.info(`Starting Soak Test [VUs: ${vus}, Duration: ${duration}]...`);
  return { startedAt: Date.now() };
}

export default function () {
  executeWorkload();
}

export function teardown(data) {
  logger.info(`Soak Test completed. Elapsed: ${(Date.now() - data.startedAt) / 1000}s`);
}

export const handleSummary = buildSummaryHandler('soak', 'Soak Test (Endurance & Leaks)');
