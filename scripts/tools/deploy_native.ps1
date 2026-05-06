# 🚀 SCRIPT DE BUILD NATIVO - INNOVATION IA
# Este script automatiza a geracao do .exe final

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = "c:\Users\eduar\Desktop\innovation.ia"

Write-Host "🎨 Iniciando Build do Frontend Next.js..." -ForegroundColor Cyan
Set-Location "$PROJECT_ROOT\FRONTEND"
npm run build

Write-Host "📦 Preparando estrutura para Electron..." -ForegroundColor Cyan
$OUT_DIR = "$PROJECT_ROOT\FRONTEND\out"
$APP_RESOURCES = "$PROJECT_ROOT\WHATSAPP\resources\app"

if (-not (Test-Path $APP_RESOURCES)) { New-Item -ItemType Directory -Path $APP_RESOURCES -Force }
Copy-Item -Path "$OUT_DIR\*" -Destination $APP_RESOURCES -Recurse -Force

Write-Host "🔨 Gerando Executável Nativo (.exe)..." -ForegroundColor Cyan
Set-Location "$PROJECT_ROOT\WHATSAPP"
npm run dist

Write-Host "✅ SUCESSO! O instalador final está na pasta: WHATSAPP\dist" -ForegroundColor Green
Write-Host "🚀 Innovation IA está pronto para o mercado!" -ForegroundColor Green
