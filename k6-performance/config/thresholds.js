/**
 * Standard Performance Thresholds across test profiles.
 * Thresholds define SLA criteria (Pass/Fail) for k6 runs.
 */

export const THRESHOLDS = {
  // 1. Smoke Test Thresholds: Strict verification that baseline endpoints respond cleanly
  smoke: {
    http_req_failed: ['rate<0.01'],              // Less than 1% errors
    http_req_duration: ['p(95)<400', 'p(99)<800'],// 95% < 400ms, 99% < 800ms
    'checks': ['rate>0.99'],                     // 99%+ checks passed
  },

  // 2. Load Test Thresholds: Expected typical production load
  load: {
    http_req_failed: ['rate<0.02'],              // Less than 2% errors under load
    http_req_duration: ['p(90)<500', 'p(95)<800', 'p(99)<1500'],
    'checks': ['rate>0.98'],
  },

  // 3. Stress Test Thresholds: High load beyond typical peak
  stress: {
    http_req_failed: ['rate<0.05'],              // Allow up to 5% failure under stress
    http_req_duration: ['p(90)<1000', 'p(95)<2000'],
    'checks': ['rate>0.95'],
  },

  // 4. Spike Test Thresholds: Sharp burst of traffic
  spike: {
    http_req_failed: ['rate<0.10'],              // Max 10% errors during sudden spike
    http_req_duration: ['p(95)<3000'],           // Recovery SLA
    'checks': ['rate>0.90'],
  },

  // 5. Soak / Endurance Test Thresholds: Long duration stability
  soak: {
    http_req_failed: ['rate<0.02'],              // Low error rate across long hours
    http_req_duration: ['p(90)<600', 'p(95)<1000'],
    'checks': ['rate>0.98'],
  },

  // 6. Breakpoint Test Thresholds: System capacity discovery with automated abort
  breakpoint: {
    // Abort test immediately if failure rate exceeds 20% or response time degrades past 5s
    http_req_failed: [{ threshold: 'rate<0.20', abortOnFail: true, delayAbortEval: '10s' }],
    http_req_duration: [{ threshold: 'p(95)<5000', abortOnFail: true, delayAbortEval: '10s' }],
  },

  // Helper to attach custom business metric thresholds
  withCustomMetrics: (baseThresholds, customMetrics = {}) => {
    return Object.assign({}, baseThresholds, customMetrics);
  },
};
