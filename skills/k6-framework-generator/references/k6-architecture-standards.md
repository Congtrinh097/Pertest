# K6 Framework Architecture Standards & Best Practices

This document establishes the mandatory engineering standards for generating production-ready K6 performance testing frameworks.

---

## 1. Runtime Constraints & Compatibility Rules

K6 executes scripts in an isolated Go-based JavaScript engine (goja), NOT Node.js:

| Anti-Pattern (DO NOT DO) | Correct K6 Implementation |
| :--- | :--- |
| ❌ Using `process.env.VAR` | ✅ Using `__ENV.VAR` |
| ❌ Using `require('module')` | ✅ Using ES6 `import ... from '...'` |
| ❌ Using Node.js `fs.readFileSync()` | ✅ Using K6 `open(filepath)` in the **init context** only |
| ❌ Using `npm` runtime libraries (lodash, axios) | ✅ Using pure standard JavaScript or official `jslib.k6.io` |
| ❌ Storing global shared mutable state across VUs | ✅ Embracing per-VU isolated execution context |

---

## 2. Directory Architecture & Layering

The generated framework must strictly separate concerns into distinct layers:

```text
k6-performance/
├── config/             # Environment URLs, test constants, SLAs, thresholds
├── services/api/       # HTTP Client wrapper & domain API services (CRUD & Auth)
├── services/frontend/  # High-level business flows simulating user interactions
├── scenarios/          # Atomic CRUD scenarios & user journey workflows
├── data/               # Dynamic factories, static fixtures, test data provider
├── utils/              # Auth manager, checks, correlation tracing, cleanup, sleep, logger
├── tests/              # 6 Performance test profile entrypoints (Smoke, Load, Stress, Spike, Soak, Breakpoint)
└── reports/            # Output directories for HTML, JSON, and summary logs
```

### Layer Responsibilities
1. **Config Layer**:
   - `environments/{dev,staging,production}.json`: Environment-specific endpoints and parameters.
   - `test-config.js`: Dynamic resolver reading `__ENV.ENV` / `__ENV.TARGET_ENV`, merging CLI overrides.
   - `constants.js`: Status codes, HTTP headers, standard timeouts, tags.
   - `thresholds.js`: Centralized SLA criteria per test profile.
2. **Services Layer**:
   - `http-client.js`: Wraps `k6/http`, injects headers (Auth, JSON, Correlation IDs), measures latencies via custom `Trend` metrics, logs errors.
   - Domain Services (`auth.api.js`, `user.api.js`, etc.): Call `HttpClient` methods and return response objects. Never define load profiles here.
3. **Scenarios Layer**:
   - Encapsulates domain logic without defining VUs or test durations.
   - Uses `group()` blocks with human think times between steps.
4. **Data Layer**:
   - `factories/`: Functions that generate unique, collision-free payloads using `__VU`, `__ITER`, and UUIDs.
   - `fixtures/`: Static seed data pre-loaded via `open()` in init context.
5. **Utils Layer**:
   - `auth.js`: Manages token retrieval and per-VU session headers.
   - `checks.js`: Standardized response validation (`checkStatus`, `checkJsonBody`).
   - `correlation.js`: Injects distributed tracing headers (`X-Correlation-ID`, `X-Request-ID`).
   - `cleanup.js`: Tracks created entities and deletes them in-iteration or teardown.
   - `sleep.js`: Realistic think time functions (`randomSleep(1, 3)`).
   - `reporter.js`: Multi-output handler exporting timestamped HTML dashboards, JSON summaries, and console logs.
6. **Tests Layer**:
   - The 6 test profile scripts configuring specific K6 executors (`constant-vus`, `ramping-vus`, `ramping-arrival-rate`).

---

## 3. Data Isolation Strategy Between Virtual Users

Concurrency conflicts, duplicate keys, or race conditions invalidate performance tests. Follow these rules:

1. **Unique Identity Seeds**:
   Every dynamic entity must incorporate `__VU` and `__ITER`:
   ```javascript
   export function generateVUSafeIdentifier(prefix = 'entity') {
     const vu = typeof __VU !== 'undefined' ? __VU : 0;
     const iter = typeof __ITER !== 'undefined' ? __ITER : 0;
     const uniqueToken = Math.random().toString(36).substring(2, 8);
     return `${prefix}_vu${vu}_it${iter}_${Date.now()}_${uniqueToken}`;
   }
   ```
2. **VU-Safe Emails**:
   Format: `user_vu${__VU}_it${__ITER}_${hash}@perf-test.internal`.
3. **VU Memory Isolation**:
   Variables declared in module scope (`let token = null;`) are instantiated once per VU thread. VUs never share or overwrite each other's memory variables.

---

## 4. Resource Cleanup & Teardown Protocol

Testing against shared or persistent databases without cleanup leads to database bloat and performance skew:
1. When creating resources during a test, register their IDs in the `cleanupRegistry`:
   ```javascript
   cleanupRegistry.register('users', createdId, (id) => userApi.deleteUser(id));
   ```
2. Run cleanup at the end of each scenario iteration, or during the test teardown phase.
3. Make cleanup configurable via `CLEANUP_ENABLED=true/false` so it can be skipped in disposable sandbox databases.

---

## 5. Distributed Tracing & Telemetry Injection

To correlate K6 synthetic load with backend APM tools (OpenTelemetry, Datadog, Dynatrace):
- Inject `X-Correlation-ID` and `X-Request-ID` into every outbound request.
- Format: `k6-vu${__VU}-it${__ITER}-${uuid}`.
- Allows backend engineers to trace synthetic bottlenecks directly in their distributed tracing systems.
