$content = Get-Content -LiteralPath 'apps/web/app/[tenant]/dashboard/page.tsx' -Raw
$content = $content -replace '"/\\/dashboard/platform"', "`"/\$tenant/dashboard/platform`""
$content = $content -replace '"/\\/dashboard/platform/finance"', "`"/\$tenant/dashboard/platform/finance`""
Set-Content -LiteralPath 'apps/web/app/[tenant]/dashboard/page.tsx' -Value $content
