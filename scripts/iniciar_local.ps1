# iniciar_local.ps1 - Innovation.ia Dev Server
# Sobe o app novo: API NestJS + frontend Next.js

$ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Innovation.ia - Iniciando Servidores...           " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Abrindo API Nest..." -ForegroundColor Yellow
$backendArgs = @(
    "-NoExit",
    "-Command",
    "cd '$ROOT'; Write-Host '>>> API: http://localhost:3333' -ForegroundColor Green; npm run dev:api"
)
Start-Process powershell -ArgumentList $backendArgs

Start-Sleep -Seconds 2

Write-Host "[2/2] Abrindo frontend Next..." -ForegroundColor Yellow
$frontendArgs = @(
    "-NoExit",
    "-Command",
    "cd '$ROOT'; Write-Host '>>> FRONTEND: http://localhost:3000' -ForegroundColor Green; npm run dev:web"
)
Start-Process powershell -ArgumentList $frontendArgs

Write-Host "`n====================================================" -ForegroundColor Green
Write-Host "  Duas janelas abertas!" -ForegroundColor Green
Write-Host "  Aguarde ~20 segundos e acesse:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  http://localhost:3000             (App Web novo)" -ForegroundColor White
Write-Host "  http://localhost:3000/dashboard   (Dashboard)" -ForegroundColor White
Write-Host "  http://localhost:3000/jobs        (RH Publico)" -ForegroundColor White
Write-Host "  http://localhost:3333/docs        (Swagger API)" -ForegroundColor White
Write-Host "====================================================" -ForegroundColor Green
