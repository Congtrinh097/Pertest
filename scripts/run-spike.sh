#!/usr/bin/env bash
set -e

# ==============================================================================
# Spike Test Runner (Surge Traffic & Recovery Evaluation)
# Measures recovery time and resilience under sudden bursts.
# ==============================================================================

ENV="${ENV:-dev}"
PEAK_RATE="${SPIKE_PEAK_RATE:-80}"
SCRIPT_PATH="k6-performance/tests/spike/crud.spike.js"

if [ "${ENV}" = "production" ] || [ "${ENV}" = "prod" ]; then
  echo "ERROR: Spike testing against PRODUCTION is prohibited for safety!"
  exit 1
fi

echo "=============================================================================="
echo " Running K6 Spike Test [Environment: ${ENV}]"
echo " Peak Arrival Rate: ${PEAK_RATE} req/s"
echo "=============================================================================="

k6 run \
  -e ENV="${ENV}" \
  -e SPIKE_PEAK_RATE="${PEAK_RATE}" \
  "$@" \
  "${SCRIPT_PATH}"
