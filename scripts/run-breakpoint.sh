#!/usr/bin/env bash
set -e

# ==============================================================================
# Breakpoint Test Runner (Capacity Discovery & Breaking Point)
# Continuously increases arrival rate with automated threshold abort.
# ==============================================================================

ENV="${ENV:-dev}"
MAX_RATE="${BREAKPOINT_MAX_RATE:-250}"
SCRIPT_PATH="k6-performance/tests/breakpoint/crud.breakpoint.js"

if [ "${ENV}" = "production" ] || [ "${ENV}" = "prod" ]; then
  echo "ERROR: Breakpoint testing against PRODUCTION is strictly prohibited!"
  exit 1
fi

echo "=============================================================================="
echo " Running K6 Breakpoint Test [Environment: ${ENV}]"
echo " Stepped target ceiling: ${MAX_RATE} req/s (Safety abort enabled)"
echo "=============================================================================="

k6 run \
  -e ENV="${ENV}" \
  -e BREAKPOINT_MAX_RATE="${MAX_RATE}" \
  "$@" \
  "${SCRIPT_PATH}"
