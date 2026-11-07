#!/usr/bin/env bash
set -e

# ==============================================================================
# Master Test Suite Runner
# Runs validation, smoke test, and standard load test sequentially.
# ==============================================================================

ENV="${ENV:-dev}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================================================="
echo " Starting Full Performance Suite [Environment: ${ENV}]"
echo "=============================================================================="

echo "[1/2] Executing Smoke Test..."
"${DIR}/run-smoke.sh"

echo "[2/2] Executing Load Test..."
"${DIR}/run-load.sh"

echo "=============================================================================="
echo " All Performance Tests Completed Successfully!"
echo " Reports available in: k6-performance/reports/html/"
echo "=============================================================================="
