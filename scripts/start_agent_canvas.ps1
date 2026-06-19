param(
  [int]$Port = 8000,
  [switch]$Minimal,
  [switch]$FrontendOnly,
  [switch]$BackendOnly
)

$ErrorActionPreference = "Stop"

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$canvasDir = Join-Path $repoRoot "agent-canvas"
$canvasPackage = Join-Path $canvasDir "package.json"

if (-not (Test-Path -LiteralPath $canvasPackage)) {
  throw "agent-canvas/package.json was not found. Keep agent-canvas at the repository root."
}

if ($FrontendOnly -and $BackendOnly) {
  throw "Use either -FrontendOnly or -BackendOnly, not both."
}

$env:VITE_WORKING_DIR = $repoRoot
$env:PORT = "$Port"

Write-Host "Agent Canvas workspace: $repoRoot"
Write-Host "Agent Canvas URL:       http://localhost:$Port"

Push-Location $canvasDir
try {
  if ($Minimal) {
    npm run dev:minimal
    exit $LASTEXITCODE
  }

  $npmArgs = @("run", "dev")
  $canvasArgs = @()

  if ($FrontendOnly) {
    $canvasArgs += "--frontend-only"
  }

  if ($BackendOnly) {
    $canvasArgs += "--backend-only"
  }

  if ($canvasArgs.Count -gt 0) {
    $npmArgs += "--"
    $npmArgs += $canvasArgs
  }

  npm @npmArgs
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
