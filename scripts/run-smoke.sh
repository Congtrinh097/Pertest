#!/usr/bin/env bash
set -e

# ==============================================================================
# Smoke Test Runner (1-2 VUs, ~1 minute)
# Validates basic functionality, availability, and SLA compliance.
# ==============================================================================

ENV="${ENV:-dev}"
VUS="${VUS:-2}"
DURATION="${DURATION:-1m}"
SCRIPT_PATH="k6-performance/tests/smoke/crud.smoke.js"

echo "=============================================================================="
echo " Running K6 Smoke Test [Environment: ${ENV}]"
echo " VUs: ${VUs} | Duration: ${DURATION}"
echo "=============================================================================="

k6 run \
  -e ENV="${ENV}" \
  -e VUS="${VUS}" \
  -e DURATION="${DURATION}" \
  "$@" \
  "${SCRIPT_PATH}"
