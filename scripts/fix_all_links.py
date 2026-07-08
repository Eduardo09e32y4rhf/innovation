import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if there are any hardcoded /dashboard links
    if '="/dashboard' not in content and '`/dashboard' not in content and "'/dashboard" not in content:
        return

    # Skip files that don't export a component (very simple heuristic)
    if 'export default function' not in content and 'export function' not in content:
        return

    # 1. Ensure useParams is imported
    if 'useParams' not in content:
        if "from 'next/navigation'" in content:
            content = re.sub(r"(import\s+\{[^}]*?)(\}\s+from\s+'next/navigation')", r"\1, useParams \2", content)
        else:
            content = "import { useParams } from 'next/navigation';\n" + content

    # 2. Add tenant variable inside the main component
    def add_tenant(match):
        comp_start = match.group(0)
        return comp_start + "\n  const params = useParams();\n  const tenant = params?.tenant as string;\n"
    
    if "const tenant =" not in content and "const tenant=" not in content:
        # Match the first export default function or export function
        content = re.sub(r'export\s+(?:default\s+)?function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{', add_tenant, content, count=1)

    # 3. Replace href="/dashboard/..." with href={`/${tenant}/dashboard/...`}
    content = re.sub(r'href="/dashboard([^"]*)"', r"href={`/${tenant}/dashboard\1`}", content)
    
    # 4. Replace router.push('/dashboard...') with router.push(`/${tenant}/dashboard...`)
    content = re.sub(r"router\.push\('/dashboard([^']*)'\)", r"router.push(`/${tenant}/dashboard\1`)", content)
    content = re.sub(r"router\.push\(`/dashboard([^`]*)`\)", r"router.push(`/${tenant}/dashboard\1`)", content)

    # 5. Replace <Link href={`/dashboard/...`}> with <Link href={`/${tenant}/dashboard/...`}>
    content = re.sub(r"href=\{`/dashboard([^`]*)`\}", r"href={`/${tenant}/dashboard\1`}", content)

    # 6. Replace redirect('/dashboard...')
    content = re.sub(r"redirect\('/dashboard([^']*)'\)", r"redirect(`/${tenant}/dashboard\1`)", content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {filepath}")

for root, dirs, files in os.walk('apps/web/app'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            fix_file(os.path.join(root, file))
