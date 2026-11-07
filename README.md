# Enterprise K6 Performance Testing Framework

A production-ready, modular Performance Testing Framework built with **Grafana K6**, engineered for enterprise scalability, distributed tracing, realistic human pacing, and automated CI/CD gating.

---

## 1. Architecture Overview

This framework adheres strictly to clean architecture and separation of concerns:
- **HTTP Transport Isolation**: [`HttpClient`](file:///E:/Pertest/k6-performance/services/api/http-client.js) centralizes all request dispatches, automatic correlation header injection, latency trend collection, and structured error logging.
- **Resource API Services**: Domain models ([`auth.api.js`](file:///E:/Pertest/k6-performance/services/api/auth.api.js), [`user.api.js`](file:///E:/Pertest/k6-performance/services/api/user.api.js), [`product.api.js`](file:///E:/Pertest/k6-performance/services/api/product.api.js)) expose business methods without exposing transport internals.
- **Independent Business Scenarios**: Workflows (Individual CRUD, Full CRUD, User Journeys) are detached from execution profiles and workload schedules.
- **Pluggable Workload Dispatcher**: Supports **Individual API testing**, **Business Workflow testing**, and **Mixed Workload testing** with configurable traffic distribution.
- **Targeted K6 Executors**: Uses dedicated executors suited for each test profile (`constant-vus`, `ramping-vus`, `ramping-arrival-rate`).
- **Data Isolation & Pacing**: Factories guarantee collision-resistant entities per Virtual User (VU) and iteration. Pacing utilities simulate realistic human think times (Gaussian and randomized).
- **Multi-Format Reporting**: Generates standalone HTML dashboards, JSON metrics, and terminal summaries tagged with timestamps and environments.

---

## 2. Directory Structure

```text
├── .env.example                               # Environment variable template
├── .gitignore                                 # Git ignore rules for reports and secrets
├── azure-pipelines.yml                        # Azure DevOps CI/CD pipeline
├── Dockerfile                                 # Container build definition for K6
├── docker-compose.yml                         # Containerized multi-profile test orchestration
├── package.json                               # NPM scripts and project metadata
├── README.md                                  # Complete framework documentation
├── DISCOVERY.md                               # Discovery findings & API mapping guide
├── .github/
│   └── workflows/
│       └── k6-performance.yml                 # GitHub Actions automated CI/CD pipeline
├── scripts/
│   ├── run-smoke.sh / run-smoke.ps1           # Smoke test runner
│   ├── run-load.sh / run-load.ps1             # Load test runner
│   ├── run-stress.sh                          # Stress test runner
│   ├── run-spike.sh                           # Spike test runner
│   ├── run-soak.sh                            # Soak / endurance test runner
│   ├── run-breakpoint.sh                      # Breakpoint capacity test runner
│   └── run-all.sh / run-all.ps1               # Master sequential runner
└── k6-performance/
    ├── config/
    │   ├── environments/
    │   │   ├── dev.json                       # Development & mock API settings
    │   │   ├── staging.json                   # Staging environment config
    │   │   └── production.json                # Production environment config
    │   ├── constants.js                       # Headers, status codes, default timeouts
    │   ├── test-config.js                     # Dynamic environment & CLI flag resolver
    │   └── thresholds.js                      # Centralized SLA thresholds per profile
    ├── tests/
    │   ├── smoke/crud.smoke.js                # Sanity profile (constant-vus)
    │   ├── load/crud.load.js                  # Peak traffic profile (ramping-vus)
    │   ├── stress/crud.stress.js              # Beyond capacity profile (ramping-vus)
    │   ├── spike/crud.spike.js                # Surge traffic profile (ramping-arrival-rate)
    │   ├── soak/crud.soak.js                  # Endurance profile (constant-vus)
    │   └── breakpoint/crud.breakpoint.js      # Limits discovery (ramping-arrival-rate + abort)
    ├── scenarios/
    │   ├── workload-dispatcher.js             # Universal workload router (Individual/Workflow/Mixed)
    │   ├── crud/
    │   │   ├── create.scenario.js             # POST creation scenario
    │   │   ├── read.scenario.js               # GET retrieval & query scenario
    │   │   ├── update.scenario.js             # PUT/PATCH modification scenario
    │   │   ├── delete.scenario.js             # DELETE cleanup scenario
    │   │   └── full-crud.scenario.js          # Full atomic CRUD lifecycle
    │   └── user-journeys/
    │       └── user-management.scenario.js    # Multi-step business workflow
    ├── services/
    │   ├── api/
    │   │   ├── http-client.js                 # Central HTTP client wrapper
    │   │   ├── auth.api.js                    # Authentication & session service
    │   │   ├── user.api.js                    # User CRUD service
    │   │   └── product.api.js                 # Product catalog service
    │   └── frontend/
    │       └── user-journey.js                # End-to-end user journey simulation
    ├── data/
    │   ├── factories/
    │   │   ├── user.factory.js                # Dynamic collision-free user generator
    │   │   └── product.factory.js             # Dynamic product generator
    │   ├── fixtures/
    │   │   ├── users.json                     # Seed user accounts
    │   │   └── products.json                  # Seed product inventory
    │   └── test-data.js                       # Centralized test data provider
    ├── utils/
    │   ├── auth.js                            # Isolated VU Bearer token manager
    │   ├── checks.js                          # Response validation & JSON schema checks
    │   ├── cleanup.js                         # Transient entity cleanup registry
    │   ├── correlation.js                     # X-Correlation-ID / tracing injection
    │   ├── logger.js                          # Leveled logger (DEBUG, INFO, WARN, ERROR)
    │   ├── random.js                          # Collision-safe UUIDs, emails, random data
    │   ├── reporter.js                        # HTML dashboard & JSON summary generator
    │   └── sleep.js                           # Human think time simulation
    └── reports/
        ├── html/                              # Timestamped & latest HTML dashboards
        ├── json/                              # Timestamped & latest JSON metrics
        └── summary/                           # Timestamped console summary logs
```

---

## 3. Installation & Prerequisites

### Option A: Docker (Zero Local Dependencies)
Docker is fully supported. No local installation of K6 or Node.js is required.
Verify Docker is running:
```bash
docker --version
```

### Option B: Local K6 CLI Installation
Install the official K6 binary:
- **Windows**: `winget install k6` or `choco install k6`
- **macOS**: `brew install k6`
- **Linux (Debian/Ubuntu)**:
  ```bash
  sudo gpg -k
  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update && sudo apt-get install k6
  ```

---

## 4. Configuration

The framework reads configuration dynamically using K6's native `__ENV` variables (never relying on Node.js-only `process.env`).

### Environment Profiles
Pre-configured in [`k6-performance/config/environments/`](file:///E:/Pertest/k6-performance/config/environments/):
- **`dev.json`**: Development / mock API mode (defaults to `https://dummyjson.com` for instant turnkey testing).
- **`staging.json`**: Pre-production staging endpoints.
- **`production.json`**: Live production environment with strict safety guards.

### Setting Configurations via CLI
```bash
# Target Staging
k6 run -e ENV=staging k6-performance/tests/smoke/crud.smoke.js

# Custom Base URL
k6 run -e BASE_URL=https://api-preview.internal k6-performance/tests/smoke/crud.smoke.js

# Custom Concurrency & Duration
k6 run -e VUS=50 -e DURATION=5m k6-performance/tests/load/crud.load.js
```

### Supported Environment Variables
| Variable | Default | Description |
| :--- | :--- | :--- |
| `ENV` / `TARGET_ENV` | `dev` | Target environment (`dev`, `staging`, `production`) |
| `BASE_URL` | Config Default | Overrides target API root URL |
| `AUTH_TOKEN` | *None* | Direct Bearer token (bypasses login API call) |
| `USERNAME` | Config Default | Service account username for login API |
| `PASSWORD` | Config Default | Service account password for login API |
| `REQUEST_TIMEOUT` | `15s` | HTTP request timeout ceiling |
| `VUS` | Profile Default | Concurrency level |
| `DURATION` | Profile Default | Test duration |
| `SOAK_DURATION` | `20m` | Duration for soak / endurance tests |
| `WORKLOAD_MODE` | `mixed` | Workload pattern: `mixed`, `workflow`, `individual` |
| `OPERATION` | `get` | Target operation for individual mode: `get`, `post`, `put`, `delete` |
| `WEIGHT_GET` | `70` | % distribution for GET operations in mixed mode |
| `WEIGHT_POST` | `15` | % distribution for POST operations in mixed mode |
| `WEIGHT_PUT` | `10` | % distribution for PUT operations in mixed mode |
| `WEIGHT_DELETE` | `5` | % distribution for DELETE operations in mixed mode |
| `CLEANUP_ENABLED` | `true` | Enables or disables deletion of test-created entities |
| `LOG_LEVEL` | `INFO` | Logging level (`DEBUG`, `INFO`, `WARN`, `ERROR`) |

---

## 5. Authentication

The framework supports two robust authentication modes:
1. **Dynamic Login API**:
   - Each Virtual User logs in via [`authApi.login()`](file:///E:/Pertest/k6-performance/services/api/auth.api.js).
   - Extracts the Bearer JWT token from standard JSON structures (`token`, `accessToken`, `data.token`).
   - Caches the token in VU memory via [`authManager`](file:///E:/Pertest/k6-performance/utils/auth.js).
   - Automatically injects `Authorization: Bearer <token>` into all subsequent outbound requests.
2. **Direct Token Injection**:
   - Supply a pre-generated token via `AUTH_TOKEN` to skip the login API step:
     ```bash
     k6 run -e AUTH_TOKEN=eyJhbGciOi... k6-performance/tests/smoke/crud.smoke.js
     ```
   - Tokens and credentials are scrubbed and never printed in standard log outputs.

---

## 6. The Six Performance Test Profiles

### 1. Smoke Test
- **Purpose**: Verify basic functionality, schema validity, and availability.
- **Executor**: `constant-vus` (1-2 VUs, ~30s-1m).
- **Run Command**:
  ```bash
  ./scripts/run-smoke.sh
  # Or via npm:
  npm run test:smoke
  ```

### 2. Load Test
- **Purpose**: Measure response time, throughput, and error rates under normal expected peak traffic.
- **Executor**: `ramping-vus` (Ramp up &rarr; Sustained steady state &rarr; Ramp down).
- **Run Command**:
  ```bash
  ./scripts/run-load.sh
  # Or via npm:
  npm run test:load
  ```

### 3. Stress Test
- **Purpose**: Gradually increase load beyond normal capacity to determine practical capacity limits and failure behavior.
- **Executor**: `ramping-vus` (Stepped staircase ramp up to 120+ VUs).
- **Run Command**:
  ```bash
  ./scripts/run-stress.sh
  # Or via npm:
  npm run test:stress
  ```

### 4. Spike Test
- **Purpose**: Simulate sudden, explosive traffic surges to evaluate auto-scaling, queueing, and recovery time.
- **Executor**: `ramping-arrival-rate` (Surges from 5 req/s baseline to 80+ req/s in 10s, holds, drops, and measures recovery).
- **Run Command**:
  ```bash
  ./scripts/run-spike.sh
  # Or via npm:
  npm run test:spike
  ```

### 5. Soak Test
- **Purpose**: Extended steady-state execution to identify memory leaks, database connection pool exhaustion, and gradual degradation.
- **Executor**: `constant-vus` (25 VUs sustained for 20m - 2h).
- **Run Command**:
  ```bash
  ./scripts/run-soak.sh
  # Or via npm:
  npm run test:soak
  ```

### 6. Breakpoint Test
- **Purpose**: Increase load in controlled steps to discover the exact point where the system violates defined SLOs. Features automated threshold abort (`abortOnFail: true`) to safely terminate execution if error rate exceeds 20% or response times exceed 5s.
- **Executor**: `ramping-arrival-rate` (Ramps through 20 &rarr; 50 &rarr; 100 &rarr; 150 &rarr; 200 &rarr; 250+ req/s).
- **Run Command**:
  ```bash
  ./scripts/run-breakpoint.sh
  # Or via npm:
  npm run test:breakpoint
  ```

---

## 7. Workload Models

The framework provides 3 distinct workload execution models via [`workload-dispatcher.js`](file:///E:/Pertest/k6-performance/scenarios/workload-dispatcher.js):

### A. Individual API Testing
Target a specific HTTP verb or operation to isolate single-endpoint performance:
```bash
# Test GET operations only
npm run test:individual:get

# Test POST operations only
npm run test:individual:post

# Custom verb via CLI
k6 run -e WORKLOAD_MODE=individual -e OPERATION=delete k6-performance/tests/smoke/crud.smoke.js
```

### B. Business Workflow Testing
Executes full end-to-end multi-step user workflows (Atomic CRUD lifecycle, User onboarding, Catalog checkout journey):
```bash
npm run test:workflow
```

### C. Mixed Workload Testing
Executes a realistic distribution of operations to prevent accidental write overloading while simulating real user behaviors:
```bash
# Default: GET 70%, POST 15%, PUT 10%, DELETE 5%
npm run test:mixed

# Custom distribution (e.g., Read-heavy 90% GET, 5% POST, 3% PUT, 2% DELETE)
k6 run -e WORKLOAD_MODE=mixed -e WEIGHT_GET=90 -e WEIGHT_POST=5 -e WEIGHT_PUT=3 -e WEIGHT_DELETE=2 k6-performance/tests/load/crud.load.js
```

---

## 8. Docker Execution

Run any test type inside Docker without installing dependencies:

```bash
# 1. Run Smoke Test
docker-compose run --rm k6-smoke

# 2. Run Load Test
docker-compose run --rm k6-load

# 3. Run Stress Test
docker-compose run --rm k6-stress

# 4. Run Spike Test
docker-compose run --rm k6-spike

# 5. Run Soak Test
docker-compose run --rm k6-soak

# 6. Run Breakpoint Test
docker-compose run --rm k6-breakpoint
```

Reports are automatically mounted and written to your host's [`k6-performance/reports/`](file:///E:/Pertest/k6-performance/reports) directory.

---

## 9. CI/CD Integration

### GitHub Actions
A production CI/CD workflow is included at [`.github/workflows/k6-performance.yml`](file:///E:/Pertest/.github/workflows/k6-performance.yml):
1. **Script Validation**: Runs syntax check (`--dry-run`).
2. **Smoke Test Gate**: Executes smoke test on pull requests and pushes.
3. **Load Test Stage**: Runs against pre-production branches.
4. **Artifact Archiving**: Archives HTML dashboards, JSON summaries, and console logs.
5. **Threshold Enforcement**: Pipeline fails if SLA thresholds are breached.
6. **Safety Gate**: Restricts destructive tests (stress, spike, soak, breakpoint) from targeting production.

### Azure DevOps
A pipeline configuration is provided in [`azure-pipelines.yml`](file:///E:/Pertest/azure-pipelines.yml) with parameterized test profile selection and artifact publishing (`PublishPipelineArtifact@1`).

---

## 10. Metrics, Thresholds & Reporting

### Centralized Thresholds
Defined in [`thresholds.js`](file:///E:/Pertest/k6-performance/config/thresholds.js):
- **Smoke**: `http_req_duration: ['p(95)<400', 'p(99)<800']`, `http_req_failed: ['rate<0.01']`, `checks: ['rate>0.99']`
- **Load**: `http_req_duration: ['p(90)<500', 'p(95)<800', 'p(99)<1500']`, `http_req_failed: ['rate<0.02']`
- **Stress**: `http_req_duration: ['p(95)<2000']`, `http_req_failed: ['rate<0.05']`
- **Spike**: `http_req_duration: ['p(95)<3000']`, `http_req_failed: ['rate<0.10']`
- **Breakpoint**: `abortOnFail: true` if `rate >= 0.20` or `p(95) >= 5000ms`.

### Multi-Output Reporting
Every test execution writes:
1. **HTML Dashboard**: Saved to `reports/html/<test_type>-<env>-<timestamp>.html` and `reports/html/summary.html`.
2. **JSON Metrics**: Saved to `reports/json/<test_type>-<env>-<timestamp>.json` and `reports/summary.json`.
3. **Console Log Summary**: Saved to `reports/summary/<test_type>-<env>-<timestamp>.txt`.

---

## 11. Production Safety Guidelines

1. **Destructive Tests Prohibited in Production**:
   - `stress`, `spike`, `soak`, and `breakpoint` scripts explicitly check `ENV` and abort with an error if targeting `production`.
2. **Write Isolation**:
   - Dynamic factories use isolated VU identifiers to prevent modifying pre-existing production records.
3. **Cleanup Registry**:
   - Any transient records created with `cleanup: true` are tracked and deleted after test iterations. Set `CLEANUP_ENABLED=false` only in disposable sandbox environments.

---

## 12. Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Cannot find module ...` | Incorrect working directory | Execute commands from the repository root (`E:\Pertest`). |
| `Status 401 Unauthorized` | Invalid credentials or expired token | Check `USERNAME`/`PASSWORD` in `.env` or pass valid `AUTH_TOKEN`. |
| `Thresholds crossed` | Latency or error rate breached SLA | Review `reports/html/summary.html` to identify slow endpoints. |
| `403 Forbidden (Cloudflare / WAF)` | Synthetic User-Agent blocked | Framework uses browser UA in `constants.js`. Check IP whitelisting. |
| `Reports not generating` | Permissions or missing directories | Directories are tracked via `.gitkeep`. Run `npm run clean:reports`. |

---

## 13. Future Roadmap: Autonomous AI Performance Testing Agent

To scale beyond manual test writing, this framework is architected to evolve into an **Autonomous AI Performance Testing Agent** (integrating static AST analysis, AI discovery, automated 6-profile test generation, pre-flight safety gates, and CI/CD reporting with Grafana).

For full details, architecture pipeline diagrams, and roadmap phases, see:
👉 **[Section 5: Đề xuất nâng cấp sau này (AI Performance Testing Agent)](file:///E:/Pertest/DISCOVERY.md#L68-L194)**.
