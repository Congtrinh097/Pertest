import { THRESHOLDS } from '../../config/thresholds.js';
import { executeWorkload } from '../../scenarios/workload-dispatcher.js';
import { buildSummaryHandler } from '../../utils/reporter.js';
import { logger } from '../../utils/logger.js';

/**
 * 4. SPIKE TEST PROFILE
 * Purpose: Simulate sudden traffic surges to evaluate auto-scaling, queuing, and recovery time.
 * Executor: ramping-arrival-rate (Guarantees target request arrival rate regardless of latency)
 */

const baselineRate = parseInt(__ENV.SPIKE_BASELINE_RATE || '5', 10);
const peakRate = parseInt(__ENV.SPIKE_PEAK_RATE || '80', 10);
const maxVus = parseInt(__ENV.VUS || '150', 10);

export const options = {
  scenarios: {
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: baselineRate,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: maxVus,
      stages: [
        { duration: '30s', target: baselineRate }, // Normal baseline traffic
        { duration: '10s', target: peakRate },     // Sudden steep spike!
        { duration: '1m',  target: peakRate },     // Hold peak load
        { duration: '10s', target: baselineRate }, // Quick drop back to baseline
        { duration: '1m',  target: baselineRate }, // Recovery period observation
      ],
    },
  },
  thresholds: THRESHOLDS.spike,
  tags: {
    test_type: 'spike',
  },
};

export function setup() {
  const targetEnv = (__ENV.ENV || 'dev').toLowerCase();
  if (targetEnv === 'production' || targetEnv === 'prod') {
    throw new Error('SAFETY ERROR: Spike testing is strictly prohibited against PRODUCTION!');
  }
  logger.info(`Starting Spike Test [Baseline: ${baselineRate} req/s, Peak: ${peakRate} req/s]...`);
  return { startedAt: Date.now() };
}

export default function () {
  executeWorkload();
}

export function teardown(data) {
  logger.info(`Spike Test completed. Elapsed: ${(Date.now() - data.startedAt) / 1000}s`);
}

export const handleSummary = buildSummaryHandler('spike', 'Spike Test (Surge & Recovery)');
