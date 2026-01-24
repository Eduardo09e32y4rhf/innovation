\
$ErrorActionPreference = "Stop"

if (Test-Path ".\.venv\Scripts\Activate.ps1") {
  & .\.venv\Scripts\Activate.ps1
} else {
  throw "Não achei .\.venv. Rode primeiro: .\scripts\install.ps1"
}

# Carrega .env para o processo (opcional)
if (Test-Path ".\.env") {
  Get-Content .\.env | ForEach-Object {
    if ($_ -match "^\s*$") { return }
    if ($_ -match "^\s*#") { return }
    $pair = $_.Split("=",2)
    if ($pair.Length -eq 2) {
      $name = $pair[0].Trim()
      $value = $pair[1].Trim()
      [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }
}

Write-Host "Subindo API..." -ForegroundColor Cyan
uvicorn app.main:app --reload
