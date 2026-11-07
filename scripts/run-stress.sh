#!/usr/bin/env bash
set -e

# ==============================================================================
# Stress Test Runner (Beyond Practical Capacity)
# Identifies performance degradation limits and failure behavior.
# ==============================================================================

ENV="${ENV:-dev}"
VUS="${VUS:-120}"
SCRIPT_PATH="k6-performance/tests/stress/crud.stress.js"

if [ "${ENV}" = "production" ] || [ "${ENV}" = "prod" ]; then
  echo "ERROR: Stress testing against PRODUCTION is prohibited for safety!"
  exit 1
fi

echo "=============================================================================="
echo " Running K6 Stress Test [Environment: ${ENV}]"
echo " Peak VUs: ${VUS}"
echo "=============================================================================="

k6 run \
  -e ENV="${ENV}" \
  -e VUS="${VUS}" \
  "$@" \
  "${SCRIPT_PATH}"
