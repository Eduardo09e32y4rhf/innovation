# iniciar_local.ps1 — Innovation.ia Dev Server
# Abre janelas separadas para backend e frontend mostrando erros em tempo real

$ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Innovation.ia — Iniciando Servidores...           " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# ── BACKEND ──────────────────────────────────────────────────────────────────
Write-Host "`n[1/2] Abrindo backend..." -ForegroundColor Yellow
$backendArgs = @(
    "-NoExit",
    "-Command",
    "cd '$ROOT\apps\backend'; `$env:PYTHONPATH='src'; `$env:ALLOWED_ORIGINS='http://localhost:3000'; Write-Host '>>> BACKEND: http://localhost:8000' -ForegroundColor Green; python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --env-file ..\..\.env"
)
Start-Process powershell -ArgumentList $backendArgs

Start-Sleep -Seconds 2

# ── FRONTEND ─────────────────────────────────────────────────────────────────
Write-Host "[2/2] Abrindo frontend..." -ForegroundColor Yellow
$frontendArgs = @(
    "-NoExit",
    "-Command",
    "cd '$ROOT\apps\frontend'; Write-Host '>>> FRONTEND: http://localhost:3000' -ForegroundColor Green; npm run dev"
)
Start-Process powershell -ArgumentList $frontendArgs

# ── INFO ─────────────────────────────────────────────────────────────────────
Write-Host "`n====================================================" -ForegroundColor Green
Write-Host "  Duas janelas abertas!" -ForegroundColor Green
Write-Host "  Aguarde ~20 segundos e acesse:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  http://localhost:3000/login              (Login)" -ForegroundColor White
Write-Host "  http://localhost:3000/dashboard/ponto    (Ponto Eletronico)" -ForegroundColor White
Write-Host "  http://localhost:3000/dashboard/rh       (Painel RH)" -ForegroundColor White
Write-Host "  http://localhost:3000/dashboard/analytics (B.I. Analytics)" -ForegroundColor White
Write-Host "  http://localhost:8000/docs               (API Swagger)" -ForegroundColor White
Write-Host "====================================================" -ForegroundColor Green
