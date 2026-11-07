param(
  [string]$Env = "dev",
  [int]$Vus = 20,
  [string]$Duration = "3m"
)

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host " Running K6 Load Test [Environment: $Env | Target VUs: $Vus | Steady: $Duration]" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

k6 run -e ENV=$Env -e VUS=$Vus -e DURATION=$Duration k6-performance/tests/load/crud.load.js $args
