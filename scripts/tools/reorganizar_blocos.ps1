# ============================================================
# INNOVATION.IA — REORGANIZAÇÃO POR BLOCOS DE MÓDULOS
# ============================================================

$base = 'c:\Users\eduar\Desktop\innovation.ia\apps'

# 1. BLOCO: IA (Gemini, NVIDIA, GPT)
$ia = @(
  '1-ia\gemini\prompts',
  '1-ia\gemini\models',
  '1-ia\gemini\api',
  '1-ia\nvidia\models',
  '1-ia\nvidia\api',
  '1-ia\gpt\prompts',
  '1-ia\gpt\api',
  '1-ia\shared\utils',
  '1-ia\shared\types'
)

# 2. BLOCO: WHATSAPP
$whatsapp = @(
  '2-whatsapp\bot\flows',
  '2-whatsapp\bot\handlers',
  '2-whatsapp\bot\templates',
  '2-whatsapp\webhooks',
  '2-whatsapp\sessions',
  '2-whatsapp\media'
)

# 3. BLOCO: RH (Recrutamento/ATS)
$rh = @(
  '3-rh\ats\vagas',
  '3-rh\ats\candidatos',
  '3-rh\ats\pipeline',
  '3-rh\disc\avaliacao',
  '3-rh\disc\relatorios',
  '3-rh\curriculos\parser',
  '3-rh\curriculos\storage',
  '3-rh\frontend\pages',
  '3-rh\frontend\components'
)

# 4. BLOCO: FINANCEIRO (Meios de Pagamento)
$financeiro = @(
  '4-financeiro\pagamentos\mercadopago',
  '4-financeiro\pagamentos\asaas',
  '4-financeiro\pagamentos\stripe',
  '4-financeiro\pagamentos\webhooks',
  '4-financeiro\pagamentos\checkout',
  '4-financeiro\assinaturas\planos',
  '4-financeiro\assinaturas\faturas',
  '4-financeiro\frontend\checkout',
  '4-financeiro\frontend\historico'
)

# 5. BLOCO: CONTABILIDADE (Aba do Cliente)
$contabilidade = @(
  '5-contabilidade\cliente\dashboard',
  '5-contabilidade\cliente\relatorios',
  '5-contabilidade\cliente\notas-fiscais',
  '5-contabilidade\cliente\extrato',
  '5-contabilidade\frontend\pages',
  '5-contabilidade\frontend\components',
  '5-contabilidade\api\endpoints'
)

# 6. BLOCO: MIDIA (Fotos de Curriculo)
$media = @(
  '6-media\curriculo\gerador',
  '6-media\curriculo\templates',
  '6-media\curriculo\exportacao',
  '6-media\fotos\upload',
  '6-media\fotos\processamento',
  '6-media\fotos\storage',
  '6-media\assets\modelos',
  '6-media\assets\fundos',
  '6-media\frontend\editor',
  '6-media\frontend\preview'
)

# 7. BLOCO: INFRA
$infra = @(
  '7-infra\docker\compose',
  '7-infra\docker\images',
  '7-infra\gateway\kong',
  '7-infra\gateway\nginx',
  '7-infra\database\migrations',
  '7-infra\database\seeds',
  '7-infra\monitoring\logs',
  '7-infra\monitoring\metrics',
  '7-infra\ci-cd\github-actions',
  '7-infra\ci-cd\scripts'
)

# 8. BLOCO: FRONTEND (App Principal)
$front = @(
  '8-frontend\src\pages\dashboard',
  '8-frontend\src\pages\auth',
  '8-frontend\src\pages\perfil',
  '8-frontend\src\components\ui',
  '8-frontend\src\components\layout',
  '8-frontend\src\components\charts',
  '8-frontend\src\hooks',
  '8-frontend\src\services',
  '8-frontend\src\styles',
  '8-frontend\src\utils',
  '8-frontend\src\types',
  '8-frontend\public\assets\images',
  '8-frontend\public\assets\icons'
)

# Combina todos os paths
$allPaths = $ia + $whatsapp + $rh + $financeiro + $contabilidade + $media + $infra + $front

$created = 0
foreach ($rel in $allPaths) {
  $fullPath = Join-Path $base $rel
  if (-not (Test-Path $fullPath)) {
    New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
    $created++
  }
}

Write-Host "✅ Estrutura criada! $created novas pastas adicionadas."
Write-Host ''
Write-Host '📁 Estrutura final dos blocos em /apps:'
Get-ChildItem $base -Directory | Sort-Object Name | ForEach-Object {
  Write-Host "  |- $($_.Name)"
  Get-ChildItem $_.FullName -Directory | ForEach-Object {
    Write-Host "      |- $($_.Name)"
  }
}
