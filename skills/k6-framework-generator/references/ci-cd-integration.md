# CI/CD Pipeline Integration & Production Safety Guide

This guide details how to integrate K6 performance tests into Continuous Integration and Continuous Delivery (CI/CD) pipelines, enforcing automated quality gates while safeguarding production environments.

---

## 1. Five-Stage Pipeline Pattern

Every production CI/CD performance workflow must follow this sequential lifecycle:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Script Syntax Validation (k6 inspect)                    │
│    Fast static analysis of all script imports & options     │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Production Safety Guard                                  │
│    Aborts if destructive tests target live environments     │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Automated Smoke Test Gate                                │
│    Executes short sanity check (1-2 VUs, 30s)               │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Conditional Load Test Stage                              │
│    Executes against staging/perf on scheduled/release runs  │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Report Archiving & Quality Gate Enforcement              │
│    Uploads HTML/JSON artifacts; fails build if SLA breached │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Production Safety Policy

**Rule**: Destructive performance tests (`stress`, `spike`, `soak`, `breakpoint`) must NEVER run against production environments automatically.

### Policy Enforcement:
1. In CI scripts:
   ```bash
   if [ "$TARGET_ENV" = "production" ] && [ "$TEST_TYPE" != "smoke" ] && [ "$TEST_TYPE" != "load" ]; then
     echo "ERROR: Running $TEST_TYPE against production is strictly prohibited!"
     exit 1
   fi
   ```
2. In shell runners:
   - `scripts/run-stress.sh`, `scripts/run-spike.sh`, `scripts/run-soak.sh`, and `scripts/run-breakpoint.sh` check for `ENV=production` and terminate before calling K6.

---

## 3. GitHub Actions Configuration

See template at `templates/ci-workflows/github-actions.template.yml`.
Key aspects:
- Uses official `grafana/k6:latest` container.
- Supports `workflow_dispatch` with parameter dropdowns for `test_type` and `target_env`.
- Artifact upload using `actions/upload-artifact@v4` targeting `k6-performance/reports/`.
- Fails the build automatically if any threshold is breached (K6 exits with non-zero exit code).

---

## 4. Azure DevOps Configuration

See template at `templates/ci-workflows/azure-devops.template.yml`.
Key aspects:
- Parameterized YAML pipeline (`parameters.testType`, `parameters.targetEnv`).
- Uses `PublishPipelineArtifact@1` to publish HTML and JSON report artifacts.
- Enforces conditional load execution based on branch name or manual selection.

---

## 5. GitLab CI Configuration

```yaml
stages:
  - validate
  - smoke-test
  - load-test
  - archive

validate_scripts:
  stage: validate
  image: grafana/k6:latest
  script:
    - k6 inspect k6-performance/tests/smoke/crud.smoke.js

smoke_test:
  stage: smoke-test
  image: grafana/k6:latest
  script:
    - k6 run -e ENV=staging -e DURATION=30s k6-performance/tests/smoke/crud.smoke.js
  artifacts:
    when: always
    paths:
      - k6-performance/reports/

load_test:
  stage: load-test
  image: grafana/k6:latest
  script:
    - k6 run -e ENV=staging -e VUS=20 -e DURATION=3m k6-performance/tests/load/crud.load.js
  only:
    - schedules
    - web
  artifacts:
    when: always
    paths:
      - k6-performance/reports/
```
