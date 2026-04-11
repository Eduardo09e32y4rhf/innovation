# ==============================================================================
# finalizar_producao.ps1 — Script de Finalização para Produção
# ==============================================================================
# Execute: .\scripts\finalizar_producao.ps1
# Requer: Python 3.10+, pip instalado
# ==============================================================================

param(
    [switch]$SkipInstall,   # Pula instalação de dependências
    [switch]$SkipMigration, # Pula migração do banco de dados
    [switch]$SkipWebhook    # Pula registro do webhook Asaas
)

$ErrorActionPreference = "Stop"
$BackendDir = Join-Path $PSScriptRoot "..\backend"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    Innovation.ia — Finalização para Produção             ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── VERIFICAR PYTHON ──────────────────────────────────────────────────────────
Write-Host "🐍 Verificando Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   ✅ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Python não encontrado. Instale de: https://python.org" -ForegroundColor Red
    exit 1
}

# ── VERIFICAR .ENV ────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "📋 Verificando arquivo .env..." -ForegroundColor Yellow
$EnvFile = Join-Path $BackendDir ".env"
$EnvExample = Join-Path $BackendDir ".env.production.example"

if (-not (Test-Path $EnvFile)) {
    Write-Host "   ⚠️  .env não encontrado. Criando a partir do template..." -ForegroundColor Yellow
    if (Test-Path $EnvExample) {
        Copy-Item $EnvExample $EnvFile
        Write-Host "   ✅ .env criado em: $EnvFile" -ForegroundColor Green
        Write-Host ""
        Write-Host "   ⚡ AÇÃO NECESSÁRIA: Edite o .env com suas chaves:" -ForegroundColor Red
        Write-Host "   • GEMINI_API_KEY_1   → https://aistudio.google.com/app/apikey" -ForegroundColor White
        Write-Host "   • ASAAS_API_KEY      → https://www.asaas.com → Configurações → Chaves API" -ForegroundColor White
        Write-Host "   • ASAAS_WEBHOOK_TOKEN → você escolhe um token secreto" -ForegroundColor White
        Write-Host "   • DATABASE_URL       → PostgreSQL (Neon/Railway/Supabase)" -ForegroundColor White
        Write-Host "   • SECRET_KEY         → python -c 'import secrets; print(secrets.token_hex(32))'" -ForegroundColor White
        Write-Host ""
        Write-Host "   Abra o arquivo:" -ForegroundColor Yellow
        Write-Host "   notepad $EnvFile" -ForegroundColor Cyan
        Write-Host ""
        $continue = Read-Host "Pressione ENTER após editar o .env (ou 'q' para sair)"
        if ($continue -eq "q") { exit 0 }
    } else {
        Write-Host "   ❌ Template .env.production.example não encontrado em: $EnvExample" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ✅ .env encontrado" -ForegroundColor Green
}

# ── INSTALAR DEPENDÊNCIAS ────────────────────────────────────────────────────
if (-not $SkipInstall) {
    Write-Host ""
    Write-Host "📦 Instalando dependências Python..." -ForegroundColor Yellow
    Write-Host "   (isso pode levar alguns minutos na primeira vez)" -ForegroundColor Gray

    $RequirementsFile = Join-Path $BackendDir "requirements.txt"

    Set-Location $BackendDir
    & python -m pip install -r requirements.txt --quiet 2>&1 | 
        ForEach-Object { 
            if ($_ -match "Successfully installed|already satisfied") {
                Write-Host "   ✅ $_" -ForegroundColor Green
            } elseif ($_ -match "ERROR|error") {
                Write-Host "   ⚠️  $_" -ForegroundColor Yellow
            }
        }

    Write-Host ""
    Write-Host "✅ Dependências instaladas!" -ForegroundColor Green
    
    # Verificar langchain-google-genai especificamente
    $checkCmd = python -c "import langchain_google_genai; print('OK')" 2>&1
    if ($checkCmd -eq "OK") {
        Write-Host "   ✅ langchain-google-genai: instalado" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  langchain-google-genai: instalando separadamente..." -ForegroundColor Yellow
        & python -m pip install "langchain-google-genai>=1.0.0" --quiet
    }

    # Verificar boto3
    $checkBot = python -c "import boto3; print('OK')" 2>&1
    if ($checkBot -eq "OK") {
        Write-Host "   ✅ boto3 (AWS S3): instalado" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  boto3: instalando separadamente..." -ForegroundColor Yellow
        & python -m pip install "boto3>=1.34.0" --quiet
    }
}

# ── MIGRAÇÃO POSTGRESQL ───────────────────────────────────────────────────────
if (-not $SkipMigration) {
    Write-Host ""
    Write-Host "🗄️  Verificando banco de dados..." -ForegroundColor Yellow

    # Lê DATABASE_URL do .env
    $envContent = Get-Content $EnvFile | Where-Object { $_ -match "^DATABASE_URL=" }
    $dbUrl = ($envContent -split "=", 2)[1].Trim()

    if ($dbUrl -match "sqlite") {
        Write-Host "   ⚠️  DATABASE_URL ainda aponta para SQLite: $dbUrl" -ForegroundColor Yellow
        Write-Host "   Configure um PostgreSQL antes de executar a migração." -ForegroundColor Yellow
        Write-Host "   Provedores gratuitos:" -ForegroundColor White
        Write-Host "   • Neon: https://neon.tech (3GB grátis)" -ForegroundColor Cyan
        Write-Host "   • Railway: https://railway.app" -ForegroundColor Cyan
        Write-Host "   • Supabase: https://supabase.com" -ForegroundColor Cyan
        Write-Host ""
        $migrate = Read-Host "   Migrar banco agora? (s/N)"
        if ($migrate -ne "s" -and $migrate -ne "S") {
            Write-Host "   ⏩ Migração pulada. Execute: python migrate_to_postgres.py" -ForegroundColor Gray
        } else {
            Write-Host "   Execute manualmente: python migrate_to_postgres.py" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ✅ PostgreSQL configurado: $($dbUrl.Split('@')[1])" -ForegroundColor Green
        Write-Host "   Executando migração..." -ForegroundColor Yellow
        Set-Location $BackendDir
        & python migrate_to_postgres.py
    }
}

# ── WEBHOOK ASAAS ─────────────────────────────────────────────────────────────
if (-not $SkipWebhook) {
    Write-Host ""
    Write-Host "📡 Configurando webhook Asaas..." -ForegroundColor Yellow

    # Verifica se ASAAS_API_KEY está no .env
    $asaasKey = (Get-Content $EnvFile | Where-Object { $_ -match "^ASAAS_API_KEY=" } | 
                  ForEach-Object { ($_ -split "=", 2)[1].Trim() })

    if (-not $asaasKey -or $asaasKey -eq "SUA_CHAVE_ASAAS_PRODUCAO_AQUI") {
        Write-Host "   ⚠️  ASAAS_API_KEY não configurada no .env" -ForegroundColor Yellow
        Write-Host "   Obtenha em: https://www.asaas.com → Configurações → Integrações → Chaves API" -ForegroundColor Cyan
        Write-Host "   Após configurar, execute: python setup_asaas_webhook.py" -ForegroundColor White
    } else {
        Set-Location $BackendDir
        & python setup_asaas_webhook.py
    }
}

# ── VERIFICAÇÃO FINAL ────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║    ✅ Configuração de Produção Concluída                  ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📋 CHECKLIST FINAL antes de lançar:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [ ] .env preenchido com chaves reais de produção" -ForegroundColor White
Write-Host "  [ ] DATABASE_URL aponta para PostgreSQL (não SQLite)" -ForegroundColor White
Write-Host "  [ ] GEMINI_API_KEY_1 configurada e testada" -ForegroundColor White
Write-Host "  [ ] ASAAS_API_KEY de produção (não sandbox)" -ForegroundColor White
Write-Host "  [ ] ASAAS_API_URL = https://api.asaas.com/v3" -ForegroundColor White
Write-Host "  [ ] Webhook registrado no painel Asaas" -ForegroundColor White
Write-Host "  [ ] SECRET_KEY gerada com token aleatorório (não a dev)" -ForegroundColor White
Write-Host "  [ ] Teste de pagamento realizado em sandbox" -ForegroundColor White
Write-Host "  [ ] CORS configurado com domínio real (ALLOWED_ORIGINS)" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Para iniciar o servidor:" -ForegroundColor Cyan
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   uvicorn src.main:app --host 0.0.0.0 --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "🐳 Ou via Docker:" -ForegroundColor Cyan
Write-Host "   docker-compose up --build" -ForegroundColor White
Write-Host ""
