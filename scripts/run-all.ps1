param(
  [string]$Env = "dev"
)

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host " Starting Full Performance Suite [Environment: $Env]" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

& "$PSScriptRoot\run-smoke.ps1" -Env $Env
& "$PSScriptRoot\run-load.ps1" -Env $Env

Write-Host "==============================================================================" -ForegroundColor Green
Write-Host " All Performance Tests Completed Successfully!" -ForegroundColor Green
Write-Host " Reports available in: k6-performance/reports/html/" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
