---
name: k6-framework-generator
description: Autonomous AI Performance Testing Agent skill. Automatically scans application source code (Angular, React, .NET, Node.js, OpenAPI/Swagger), extracts endpoints, DTOs, auth schemes, and business flows, generates clean-architecture K6 test suites across 6 performance profiles, validates syntax and safety rules, and executes tests with real-time reporting and AI insights.
---

# K6 Framework Generator & Autonomous Performance Testing Agent

This skill implements an end-to-end autonomous performance testing system for web and API applications.

## Capabilities

1. **Repository Discovery Agent**:
   - Statically analyzes codebases (.NET ASP.NET Core, Node.js NestJS/Express/Fastify, Angular, React, Vue, Python, Java, Go).
   - Parses OpenAPI v2/v3 and Swagger specs.
   - Extracts endpoints, HTTP methods, route parameters, query parameters, DTO contracts, authentication schemes (JWT, OAuth2, API Key), and business flows.
   - Generates a structured `k6-discovery-manifest.json`.

2. **Clean-Architecture K6 Framework Generator**:
   - Generates modular API services subclassing `HttpClient`.
   - Generates collision-resistant DTO factories per Virtual User (VU) and iteration.
   - Generates atomic CRUD scenarios and end-to-end multi-step user journeys.
   - Generates 6 workload test profiles:
     - **Smoke** (Sanity check, constant-vus)
     - **Load** (Expected peak capacity, ramping-vus)
     - **Stress** (Beyond peak capacity, ramping-vus)
     - **Spike** (Instant traffic surges, ramping-arrival-rate)
     - **Soak** (Endurance and memory leak discovery, constant-vus)
     - **Breakpoint** (Limit discovery, ramping-arrival-rate with auto-abort)

3. **Pre-flight Validation Agent**:
   - Syntax and linting check (`k6 inspect` / dry-run).
   - OpenAPI / DTO contract conformance check.
   - Production safety gate (restricting destructive tests on production).
   - Anti-collision and cleanup registry verification.

4. **K6 Execution & AI Insights Analyzer**:
   - Orchestrates local K6 or Dockerized multi-profile executions.
   - Integrates with CI/CD (GitHub Actions, Azure DevOps).
   - Emits real-time metrics to Grafana via InfluxDB/Prometheus.
   - Evaluates performance metrics (P90, P95, P99, error rates, throughput) and outputs AI-driven bottleneck diagnosis and optimization recommendations.

## Usage

### CLI Commands
```bash
# 1. Full Autonomous Pipeline (Scan -> Generate -> Validate -> Run -> Analyze)
node agent/cli.js auto <source-repo-dir> smoke

# 2. Individual Agent Steps
node agent/cli.js scan <source-repo-dir>
node agent/cli.js generate k6-discovery-manifest.json
node agent/cli.js validate
node agent/cli.js run smoke
node agent/cli.js analyze k6-performance/reports/json/summary.json
```

### NPM Shortcuts
```bash
npm run agent:scan
npm run agent:generate
npm run agent:validate
npm run agent:run:smoke
npm run agent:auto
```
