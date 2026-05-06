# ============================================================
# INNOVATION.IA — MIGRAÇÃO DE ARQUIVOS PARA BLOCOS DE MÓDULOS
# ============================================================
# Estratégia: COPIA os arquivos para os blocos (não apaga os originais)
# Isso garante segurança total. Os originais ficam intactos.
# ============================================================

$root    = 'c:\Users\eduar\Desktop\innovation.ia\apps'
$backend = "$root\backend"
$frontend= "$root\frontend"
$copied  = 0
$skipped = 0
$log     = @()

function Copy-Safe {
  param($src, $dst)
  if (Test-Path $src) {
    $dir = Split-Path $dst -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Copy-Item -Path $src -Destination $dst -Force
    $script:copied++
    $script:log += "  [OK] $src -> $dst"
  } else {
    $script:skipped++
    $script:log += "  [--] NAO ENCONTRADO: $src"
  }
}

function Copy-Dir-Safe {
  param($src, $dst)
  if (Test-Path $src) {
    if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst -Force | Out-Null }
    Copy-Item -Path "$src\*" -Destination $dst -Recurse -Force
    $script:copied++
    $script:log += "  [DIR] $src -> $dst"
  } else {
    $script:skipped++
    $script:log += "  [--] NAO ENCONTRADO: $src"
  }
}

Write-Host ""
Write-Host "=============================================="
Write-Host "  INNOVATION.IA - MIGRACAO POR BLOCOS"
Write-Host "=============================================="

# -------------------------------------------------------
# BLOCO 1 — IA (Gemini, NVIDIA, GPT)
# -------------------------------------------------------
Write-Host ""
Write-Host "[1/8] Bloco: IA (Gemini / NVIDIA / GPT)..."

$ia_api = "$root\1-ia"

# Services de IA
Copy-Safe "$backend\src\services\ai_image.py"     "$ia_api\gemini\api\ai_image.py"
Copy-Safe "$backend\src\services\claude_service.py" "$ia_api\gpt\api\claude_service.py"
Copy-Safe "$backend\src\services\nvidia_service.py" "$ia_api\nvidia\api\nvidia_service.py"

# Endpoints de IA
Copy-Safe "$backend\src\api\v1\endpoints\ai.py"          "$ia_api\gemini\api\endpoints\ai.py"
Copy-Safe "$backend\src\api\v1\endpoints\ai_admin.py"    "$ia_api\gemini\api\endpoints\ai_admin.py"
Copy-Safe "$backend\src\api\v1\endpoints\ai_reports.py"  "$ia_api\gemini\api\endpoints\ai_reports.py"
Copy-Safe "$backend\src\api\v1\endpoints\ai_services.py" "$ia_api\gemini\api\endpoints\ai_services.py"

# Página frontend IA
Copy-Dir-Safe "$frontend\app\(app)\chat-ia"      "$ia_api\gemini\frontend\chat-ia"
Copy-Dir-Safe "$frontend\app\(app)\strategist"   "$ia_api\gemini\frontend\strategist"

# Componente AI Key Manager
Copy-Safe "$frontend\components\AIKeyManager.tsx" "$ia_api\gemini\frontend\components\AIKeyManager.tsx"
Copy-Safe "$frontend\components\FlowBuilderConfig" "$ia_api\gemini\frontend\components\FlowBuilderConfig" 2>$null
Copy-Dir-Safe "$frontend\components\FlowBuilderConfig" "$ia_api\gemini\frontend\components\FlowBuilderConfig"

# -------------------------------------------------------
# BLOCO 2 — WHATSAPP
# -------------------------------------------------------
Write-Host "[2/8] Bloco: WhatsApp..."

$wa = "$root\2-whatsapp"
Copy-Safe "$backend\src\services\notification_service.py" "$wa\bot\handlers\notification_service.py"
Copy-Safe "$backend\src\services\marketing_service.py"    "$wa\bot\handlers\marketing_service.py"
Copy-Safe "$backend\src\api\v1\endpoints\notifications.py" "$wa\webhooks\notifications.py"
Copy-Safe "$backend\src\api\v1\endpoints\webhooks.py"      "$wa\webhooks\webhooks.py"

# -------------------------------------------------------
# BLOCO 3 — RH (Recrutamento / ATS / DISC)
# -------------------------------------------------------
Write-Host "[3/8] Bloco: RH..."

$rh = "$root\3-rh"

# Services
Copy-Safe "$backend\src\services\rh_service.py"     "$rh\backend\services\rh_service.py"
Copy-Safe "$backend\src\services\ai_ats.py"         "$rh\disc\avaliacao\ai_ats.py"
Copy-Safe "$backend\src\services\auth_service.py"   "$rh\backend\services\auth_service.py"

# Endpoints
Copy-Safe "$backend\src\api\v1\endpoints\rh.py"            "$rh\ats\vagas\rh.py"
Copy-Safe "$backend\src\api\v1\endpoints\rh_advanced.py"   "$rh\ats\pipeline\rh_advanced.py"
Copy-Safe "$backend\src\api\v1\endpoints\candidates.py"    "$rh\ats\candidatos\candidates.py"
Copy-Safe "$backend\src\api\v1\endpoints\jobs.py"          "$rh\ats\vagas\jobs.py"
Copy-Safe "$backend\src\api\v1\endpoints\applications.py"  "$rh\ats\pipeline\applications.py"
Copy-Safe "$backend\src\api\v1\endpoints\interviews.py"    "$rh\ats\pipeline\interviews.py"
Copy-Safe "$backend\src\api\v1\endpoints\matching.py"      "$rh\ats\pipeline\matching.py"
Copy-Safe "$backend\src\api\v1\endpoints\killer_questions.py" "$rh\ats\pipeline\killer_questions.py"
Copy-Safe "$backend\src\api\v1\endpoints\documents.py"     "$rh\curriculos\parser\documents.py"
Copy-Safe "$backend\src\api\v1\endpoints\analytics.py"     "$rh\disc\relatorios\analytics.py"

# Frontend pages
Copy-Dir-Safe "$frontend\app\(app)\rh"             "$rh\frontend\pages\rh"
Copy-Dir-Safe "$frontend\app\(app)\ats"            "$rh\frontend\pages\ats"
Copy-Dir-Safe "$frontend\components\ats"           "$rh\frontend\components\ats"
Copy-Dir-Safe "$frontend\components\rh"            "$rh\frontend\components\rh"

# -------------------------------------------------------
# BLOCO 4 — FINANCEIRO (Meios de Pagamento)
# -------------------------------------------------------
Write-Host "[4/8] Bloco: Financeiro..."

$fin = "$root\4-financeiro"

# Services
Copy-Safe "$backend\src\services\asaas_service.py"    "$fin\pagamentos\asaas\asaas_service.py"
Copy-Safe "$backend\src\services\finance_service.py"  "$fin\pagamentos\mercadopago\finance_service.py"
Copy-Safe "$backend\src\services\bank_hub_service.py" "$fin\pagamentos\stripe\bank_hub_service.py"
Copy-Safe "$backend\src\services\plan_service.py"     "$fin\assinaturas\planos\plan_service.py"

# Endpoints
Copy-Safe "$backend\src\api\v1\endpoints\payments.py"         "$fin\pagamentos\checkout\payments.py"
Copy-Safe "$backend\src\api\v1\endpoints\finance.py"          "$fin\pagamentos\mercadopago\finance.py"
Copy-Safe "$backend\src\api\v1\endpoints\finance_advanced.py" "$fin\pagamentos\mercadopago\finance_advanced.py"
Copy-Safe "$backend\src\api\v1\endpoints\subscriptions.py"    "$fin\assinaturas\faturas\subscriptions.py"
Copy-Safe "$backend\src\api\v1\endpoints\plans.py"            "$fin\assinaturas\planos\plans.py"
Copy-Safe "$backend\src\api\v1\endpoints\webhooks.py"         "$fin\pagamentos\webhooks\webhooks.py"

# Frontend
Copy-Dir-Safe "$frontend\app\(app)\finance"          "$fin\frontend\checkout\finance"
Copy-Dir-Safe "$frontend\app\(app)\finance-advanced" "$fin\frontend\historico\finance-advanced"
Copy-Dir-Safe "$frontend\app\(app)\subscription"     "$fin\frontend\checkout\subscription"

# -------------------------------------------------------
# BLOCO 5 — CONTABILIDADE (Aba do Cliente)
# -------------------------------------------------------
Write-Host "[5/8] Bloco: Contabilidade..."

$cont = "$root\5-contabilidade"

# Endpoints
Copy-Safe "$backend\src\api\v1\endpoints\finance_das.py"  "$cont\api\endpoints\finance_das.py"
Copy-Safe "$backend\src\api\v1\endpoints\audit_logs.py"   "$cont\api\endpoints\audit_logs.py"
Copy-Safe "$backend\src\api\v1\endpoints\enterprise.py"   "$cont\api\endpoints\enterprise.py"
Copy-Safe "$backend\src\api\v1\endpoints\companies.py"    "$cont\api\endpoints\companies.py"

# Frontend
Copy-Dir-Safe "$frontend\app\(app)\dashboard"  "$cont\cliente\dashboard"

# -------------------------------------------------------
# BLOCO 6 — MÍDIA (Fotos / Currículo)
# -------------------------------------------------------
Write-Host "[6/8] Bloco: Midia..."

$media = "$root\6-media"

Copy-Safe "$backend\src\services\ai_image.py" "$media\fotos\processamento\ai_image.py"

# -------------------------------------------------------
# BLOCO 7 — INFRA
# -------------------------------------------------------
Write-Host "[7/8] Bloco: Infra..."

$infra = "$root\7-infra"

# Docker e scripts raiz
Copy-Safe "$root\backend\Dockerfile"   "$infra\docker\images\backend.Dockerfile"
Copy-Safe "$root\frontend\Dockerfile"  "$infra\docker\images\frontend.Dockerfile"
Copy-Safe "$root\backend\Procfile"     "$infra\ci-cd\scripts\backend.Procfile"

# Alembic (migrations)
Copy-Dir-Safe "$root\backend\alembic"  "$infra\database\migrations\alembic"
Copy-Safe "$root\backend\alembic.ini"  "$infra\database\migrations\alembic.ini"

# Health check
Copy-Safe "$backend\src\api\v1\endpoints\health.py" "$infra\monitoring\metrics\health.py"

# Gateway
Copy-Dir-Safe "$root\gateway"  "$infra\gateway\kong"

# -------------------------------------------------------
# BLOCO 8 — FRONTEND (App Principal)
# -------------------------------------------------------
Write-Host "[8/8] Bloco: Frontend..."

$fe = "$root\8-frontend"

# Auth pages
Copy-Dir-Safe "$frontend\app\(auth)"     "$fe\src\pages\auth"

# App pages - dashboard e conta
Copy-Dir-Safe "$frontend\app\(app)\dashboard"  "$fe\src\pages\dashboard"
Copy-Dir-Safe "$frontend\app\(app)\account"    "$fe\src\pages\perfil\account"
Copy-Dir-Safe "$frontend\app\(app)\onboarding" "$fe\src\pages\perfil\onboarding"
Copy-Dir-Safe "$frontend\app\(app)\support"    "$fe\src\pages\perfil\support"
Copy-Dir-Safe "$frontend\app\(app)\projects"   "$fe\src\pages\projects"
Copy-Dir-Safe "$frontend\app\(app)\projects-advanced" "$fe\src\pages\projects-advanced"
Copy-Dir-Safe "$frontend\app\(app)\csc"        "$fe\src\pages\csc"

# Global components
Copy-Safe "$frontend\components\AppLayout.tsx"          "$fe\src\components\layout\AppLayout.tsx"
Copy-Safe "$frontend\components\Sidebar.tsx"            "$fe\src\components\layout\Sidebar.tsx"
Copy-Safe "$frontend\components\AnnouncementBanner.tsx" "$fe\src\components\layout\AnnouncementBanner.tsx"
Copy-Safe "$frontend\components\MaintenanceBanner.tsx"  "$fe\src\components\layout\MaintenanceBanner.tsx"
Copy-Safe "$frontend\components\GamificationDashboard.tsx" "$fe\src\components\ui\GamificationDashboard.tsx"
Copy-Safe "$frontend\components\KanbanBoard.tsx"        "$fe\src\components\ui\KanbanBoard.tsx"
Copy-Safe "$frontend\components\QuestCard.tsx"          "$fe\src\components\ui\QuestCard.tsx"
Copy-Safe "$frontend\components\FlowiseWidget.tsx"      "$fe\src\components\ui\FlowiseWidget.tsx"
Copy-Dir-Safe "$frontend\components\ui"                 "$fe\src\components\ui"
Copy-Dir-Safe "$frontend\components\layout"             "$fe\src\components\layout"
Copy-Dir-Safe "$frontend\components\providers"          "$fe\src\components\providers"
Copy-Dir-Safe "$frontend\components\icons"              "$fe\src\components\icons"

# Styles
Copy-Safe "$frontend\app\globals.css"  "$fe\src\styles\globals.css"

# Config
Copy-Safe "$frontend\next.config.ts"      "$fe\next.config.ts"
Copy-Safe "$frontend\tailwind.config.js"  "$fe\tailwind.config.js"
Copy-Safe "$frontend\tsconfig.json"       "$fe\tsconfig.json"
Copy-Safe "$frontend\package.json"        "$fe\package.json"
Copy-Safe "$frontend\middleware.ts"       "$fe\middleware.ts"

# -------------------------------------------------------
# RELATÓRIO FINAL
# -------------------------------------------------------
Write-Host ""
Write-Host "=============================================="
Write-Host "  RESULTADO DA MIGRACAO"
Write-Host "=============================================="
Write-Host "  Copiados : $copied itens"
Write-Host "  Ignorados: $skipped itens (nao encontrados)"
Write-Host ""
Write-Host "  Estrutura de blocos em /apps:"
Get-ChildItem $root -Directory | Where-Object { $_.Name -match '^\d' } | Sort-Object Name | ForEach-Object {
  $count = (Get-ChildItem $_.FullName -Recurse -File).Count
  Write-Host "    $($_.Name) ($count arquivos copiados)"
}
Write-Host ""
Write-Host "  [SEGURANCA] Os arquivos ORIGINAIS nao foram removidos."
Write-Host "  Revise os blocos e delete manualmente quando estiver satisfeito."
Write-Host "=============================================="

# Salva log
$logPath = 'c:\Users\eduar\Desktop\innovation.ia\MIGRACAO_LOG.txt'
$log | Out-File -FilePath $logPath -Encoding UTF8
Write-Host ""
Write-Host "  Log completo salvo em: $logPath"
