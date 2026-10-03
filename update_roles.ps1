$content = Get-Content -LiteralPath 'apps/web/app/[tenant]/dashboard/page.tsx' -Raw
$content = $content -replace "DEV:\s+\{ eyebrow: 'Dashboard Dev'", "CEO: { eyebrow: 'Dashboard CEO', title: 'Visão global da plataforma', description: 'Métricas, finanças e operação centralizada.' },
    CONTABIL: { eyebrow: 'Dashboard Contábil', title: 'Visão financeira da plataforma', description: 'Assinaturas, MRR, churn e fluxo de recebimentos.' },
    DEV: { eyebrow: 'Dashboard Dev'"
$content = $content -replace "DEV:\s+\[\s*\{\s*label:\s*'Plataforma'", "CEO: [
      { label: 'Plataforma', href: `"/\$tenant/dashboard/platform`", icon: TrendingUp },
      { label: 'Financeiro', href: `"/\$tenant/dashboard/platform/finance`", icon: FileText },
    ],
    CONTABIL: [
      { label: 'Financeiro', href: `"/\$tenant/dashboard/platform/finance`", icon: FileText },
    ],
    DEV: [
      { label: 'Plataforma'"
Set-Content -LiteralPath 'apps/web/app/[tenant]/dashboard/page.tsx' -Value $content
