$env:PYTHONPATH = "$PSScriptRoot\backend\src"
Write-Host "Iniciando Innovation.IA Backend..."
cd "$PSScriptRoot\backend"
uvicorn api.main:app --reload --port 8000
