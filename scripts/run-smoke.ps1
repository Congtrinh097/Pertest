param(
  [string]$Env = "dev",
  [int]$Vus = 2,
  [string]$Duration = "1m"
)

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host " Running K6 Smoke Test [Environment: $Env | VUs: $Vus | Duration: $Duration]" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

k6 run -e ENV=$Env -e VUS=$Vus -e DURATION=$Duration k6-performance/tests/smoke/crud.smoke.js $args
