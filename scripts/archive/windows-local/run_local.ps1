# run_local.ps1 — Inicia Auth + Core + AI services localmente sem Docker
# Uso: .\run_local.ps1
# Requisito: Python 3.11+ instalado

$ErrorActionPreference = "Continue"
$ROOT = $PSScriptRoot

# Lê as variáveis do .env
$envFile = "$ROOT\..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match "^[^#]+=.*" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        [Environment]::SetEnvironmentVariable($name, $value.Trim(), "Process")
    }
    Write-Host "Variáveis de ambiente carregadas de .env" -ForegroundColor Green
} else {
    Write-Host "Arquivo .env não encontrado. Iniciando sem variáveis adicionais." -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Innovation.ia — Iniciando modo local   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Instalar dependências globais necessárias
Write-Host "`n[1/4] Instalando dependências Python..." -ForegroundColor Yellow
pip install fastapi uvicorn[standard] sqlalchemy pydantic[email] python-jose[cryptography] bcrypt pyjwt python-multipart python-dotenv google-genai httpx --quiet

# Iniciar Auth Service na porta 8001
Write-Host "`n[2/4] Iniciando Auth Service (porta 8001)..." -ForegroundColor Yellow
$authEnv = @{
    DATABASE_URL = "sqlite:///$ROOT/innovation_auth.db"
}
$authProc = Start-Process -PassThru -FilePath "python" `
    -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--reload" `
    -WorkingDirectory "$ROOT\services\auth" `
    -RedirectStandardOutput "$ROOT\logs\auth.log" `
    -RedirectStandardError "$ROOT\logs\auth_err.log"
Write-Host "  Auth PID: $($authProc.Id)" -ForegroundColor Green

Start-Sleep -Seconds 2

# Iniciar Core Service na porta 8003
Write-Host "`n[3/4] Iniciando Core Service (porta 8003)..." -ForegroundColor Yellow
$coreProc = Start-Process -PassThru -FilePath "python" `
    -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003", "--reload" `
    -WorkingDirectory "$ROOT\services\core" `
    -RedirectStandardOutput "$ROOT\logs\core.log" `
    -RedirectStandardError "$ROOT\logs\core_err.log"
Write-Host "  Core PID: $($coreProc.Id)" -ForegroundColor Green

Start-Sleep -Seconds 2

# Iniciar AI Service na porta 8002
Write-Host "`n[4/4] Iniciando AI Service (porta 8002)..." -ForegroundColor Yellow
$aiProc = Start-Process -PassThru -FilePath "python" `
    -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002", "--reload" `
    -WorkingDirectory "$ROOT\services\ai" `
    -RedirectStandardOutput "$ROOT\logs\ai.log" `
    -RedirectStandardError "$ROOT\logs\ai_err.log"
Write-Host "  AI PID: $($aiProc.Id)" -ForegroundColor Green

Start-Sleep -Seconds 3

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " Serviços iniciados!" -ForegroundColor Green
Write-Host "  Auth:  http://localhost:8001/api/auth/health" -ForegroundColor White
Write-Host "  AI:    http://localhost:8002/api/ai/health" -ForegroundColor White
Write-Host "  Core:  http://localhost:8003/api/core/health" -ForegroundColor White
Write-Host "  Front: http://localhost:3000" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nPressione Ctrl+C para parar tudo" -ForegroundColor Yellow

# Aguarda
try {
    Wait-Process -Id $authProc.Id
} catch {}
