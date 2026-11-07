#!/usr/bin/env bash
set -e

# ==============================================================================
# Load Test Runner (Expected Normal Production Peak)
# Measures response time, throughput, and error rates.
# ==============================================================================

ENV="${ENV:-dev}"
VUS="${VUS:-20}"
DURATION="${DURATION:-3m}"
SCRIPT_PATH="k6-performance/tests/load/crud.load.js"

echo "=============================================================================="
echo " Running K6 Load Test [Environment: ${ENV}]"
echo " Target VUs: ${VUS} | Steady-state: ${DURATION}"
echo "=============================================================================="

k6 run \
  -e ENV="${ENV}" \
  -e VUS="${VUS}" \
  -e DURATION="${DURATION}" \
  "$@" \
  "${SCRIPT_PATH}"
