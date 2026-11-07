#!/usr/bin/env bash
set -e

# ==============================================================================
# Soak Test Runner (Endurance & Memory Leak Analysis)
# Maintains steady load over extended period to detect gradual degradation.
# ==============================================================================

ENV="${ENV:-dev}"
VUS="${VUS:-25}"
DURATION="${SOAK_DURATION:-20m}"
SCRIPT_PATH="k6-performance/tests/soak/crud.soak.js"

if [ "${ENV}" = "production" ] || [ "${ENV}" = "prod" ]; then
  echo "ERROR: Soak testing against PRODUCTION is prohibited for safety!"
  exit 1
fi

echo "=============================================================================="
echo " Running K6 Soak / Endurance Test [Environment: ${ENV}]"
echo " VUs: ${VUS} | Duration: ${DURATION}"
echo "=============================================================================="

k6 run \
  -e ENV="${ENV}" \
  -e VUS="${VUS}" \
  -e SOAK_DURATION="${DURATION}" \
  "$@" \
  "${SCRIPT_PATH}"
