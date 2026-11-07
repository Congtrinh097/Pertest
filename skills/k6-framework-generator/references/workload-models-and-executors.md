# Workload Models & K6 Executor Selection Guide

This guide details the selection of K6 executors across the 6 performance testing profiles and explains the 3 workload execution modes.

---

## 1. K6 Executors by Performance Profile

Selecting the correct executor is critical. Using the same executor everywhere produces misleading results.

### Profile Matrix

| Test Profile | Primary Objective | K6 Executor | Why This Executor? |
| :--- | :--- | :--- | :--- |
| **1. Smoke Test** | Sanity check; verify basic functionality & availability | `constant-vus` | Runs a small, predictable number of users (1-2 VUs) for a short period (~1m) to validate endpoints cleanly without stress. |
| **2. Load Test** | Assess performance under expected normal peak traffic | `ramping-vus` | Smoothly ramps up to target peak concurrency, sustains steady-state load, then ramps down cleanly to measure steady throughput and latency. |
| **3. Stress Test** | Determine system limits and behavior beyond nominal capacity | `ramping-vus` | Uses stepped staircase stages (e.g. 25% &rarr; 50% &rarr; 75% &rarr; 100% of stress ceiling) to pinpoint exactly when degradation starts. |
| **4. Spike Test** | Evaluate auto-scaling, queueing, and recovery time from violent surges | `ramping-arrival-rate` | Unlike VU-based executors whose throughput drops if response times spike, `ramping-arrival-rate` guarantees exact request arrival rates regardless of latency. |
| **5. Soak Test** | Identify memory leaks, socket leaks, and resource exhaustion | `constant-vus` | Maintains a steady, moderate concurrency level over an extended duration (20m - 4h) to expose gradual system degradation. |
| **6. Breakpoint Test** | Discover the absolute breaking point and maximum throughput | `ramping-arrival-rate` + `abortOnFail` | Continuously increases arrival rate without plateaus. Combined with `abortOnFail: true` in thresholds, automatically stops before crashing infrastructure. |

---

## 2. Executor Configurations Examples

### A. Smoke Test (`constant-vus`)
```javascript
export const options = {
  scenarios: {
    smoke_test: {
      executor: 'constant-vus',
      vus: 2,
      duration: '1m',
    },
  },
};
```

### B. Load Test (`ramping-vus`)
```javascript
export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },  // Ramp-up
        { duration: '3m', target: 20 },  // Steady-state
        { duration: '1m', target: 0 },   // Ramp-down
      ],
      gracefulRampDown: '30s',
    },
  },
};
```

### C. Spike Test (`ramping-arrival-rate`)
```javascript
export const options = {
  scenarios: {
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 150,
      stages: [
        { duration: '30s', target: 5 },   // Normal baseline
        { duration: '10s', target: 100 }, // Sudden violent surge
        { duration: '1m',  target: 100 }, // Sustained spike
        { duration: '10s', target: 5 },   // Rapid plunge
        { duration: '1m',  target: 5 },   // Recovery observation
      ],
    },
  },
};
```

### D. Breakpoint Test (`ramping-arrival-rate` with Safety Abort)
```javascript
export const options = {
  scenarios: {
    breakpoint_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 30,
      maxVUs: 300,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '2m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 150 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 250 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.20', abortOnFail: true, delayAbortEval: '10s' }],
    http_req_duration: [{ threshold: 'p(95)<5000', abortOnFail: true, delayAbortEval: '10s' }],
  },
};
```

---

## 3. The Three Workload Models

The framework supports 3 test execution modes via [`workload-dispatcher.js`](file:///E:/Pertest/k6-performance/scenarios/workload-dispatcher.js):

### Mode A: Individual API Testing (`WORKLOAD_MODE=individual`)
Executes isolated operations against a single target endpoint or verb:
- `OPERATION=get`: Executes read/query requests only.
- `OPERATION=post`: Executes entity creation requests only.
- `OPERATION=put`: Executes entity update requests only.
- `OPERATION=delete`: Executes entity deletion requests only.

### Mode B: Business Workflow Testing (`WORKLOAD_MODE=workflow`)
Executes complete business scenarios:
- **Full CRUD Workflow**: Create &rarr; Read &rarr; Update &rarr; Read verified &rarr; Delete.
- **User Management Workflow**: Login &rarr; List team &rarr; Onboard member &rarr; Update role &rarr; Audit &rarr; Logout.
- **End-to-End User Journey**: Arrive &rarr; Browse catalog &rarr; Inspect product &rarr; Create order &rarr; View profile &rarr; Logout.

### Mode C: Mixed Workload Testing (`WORKLOAD_MODE=mixed`)
Simulates realistic production traffic by distributing requests based on configurable percentage weights:
- **Default Distribution**:
  - `WEIGHT_GET`: 70%
  - `WEIGHT_POST`: 15%
  - `WEIGHT_PUT`: 10%
  - `WEIGHT_DELETE`: 5%
- **Why this is critical**: Accidental 50/50 read/write loads corrupt databases, cause deadlocks, and do not represent realistic production user behavior.
- Fully overridable via CLI:
  ```bash
  k6 run -e WORKLOAD_MODE=mixed -e WEIGHT_GET=85 -e WEIGHT_POST=10 -e WEIGHT_PUT=3 -e WEIGHT_DELETE=2 ...
  ```
