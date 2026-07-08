import os
import re

files = [
    r'apps/web/app/[tenant]/dashboard/page.tsx',
    r'apps/web/app/[tenant]/dashboard/employees/page.tsx',
    r'apps/web/app/[tenant]/dashboard/employees/new/page.tsx',
    r'apps/web/app/[tenant]/dashboard/platform/[companyId]/page.tsx',
    r'apps/web/app/[tenant]/dashboard/time-track/page.tsx',
    r'apps/web/app/[tenant]/dashboard/time-track/clock-in/page.tsx',
    r'apps/web/app/[tenant]/dashboard/_components/notification-bell.tsx'
]

for filepath in files:
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Replace useParams().tenant with tenant
    content = content.replace("useParams().tenant", "tenant")
    
    # 2. Add import for useParams if missing
    if 'useParams' not in content:
        if "from 'next/navigation'" in content:
            content = re.sub(r"(import\s+\{[^}]*?)(\}\s+from\s+'next/navigation')", r"\1, useParams \2", content)
        else:
            content = "import { useParams } from 'next/navigation';\n" + content
            
    # 3. Add const tenant = useParams().tenant to the top of the component
    # We find the default export or export function
    
    # Simple regex to find the start of the component
    def add_tenant(match):
        comp_start = match.group(0)
        return comp_start + "\n  const params = useParams();\n  const tenant = params?.tenant || '';\n"
    
    # Check if we already have it
    if "const tenant =" not in content and "const params =" not in content:
        # Match export default function Something() {
        content = re.sub(r'export\s+(?:default\s+)?function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{', add_tenant, content, count=1)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Fixed {filepath}")
