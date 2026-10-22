$env:API_URL = "http://localhost:8000"
$env:NODE_OPTIONS = "--max-old-space-size=4096"
Write-Host "🚀 Iniciando Frontend Innovation.ia (Porta 3000)..." -ForegroundColor Cyan
cd "$PSScriptRoot\..\apps\frontend"
npm run dev
