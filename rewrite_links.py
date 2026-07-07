import os
import re

files_to_fix = [
    'apps/web/app/[tenant]/dashboard/_components/dashboard-sidebar.tsx',
    'apps/web/app/[tenant]/dashboard/_components/notification-bell.tsx',
    'apps/web/app/[tenant]/dashboard/page.tsx',
    'apps/web/app/[tenant]/dashboard/platform/[companyId]/page.tsx'
]

for file_path in files_to_fix:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        if 'useParams' not in content and 'from \'next/navigation\'' in content:
            content = content.replace('from \'next/navigation\'', 'useParams, from \'next/navigation\'')
        elif 'useParams' not in content:
            if 'use client' in content:
                content = content.replace('\'use client\';', '\'use client\';\nimport { useParams } from \'next/navigation\';')
            else:
                content = 'import { useParams } from \'next/navigation\';\n' + content

        content = re.sub(r'href="/dashboard([^"]*)"', r'href={`/${useParams().tenant}/dashboard\1`}', content)
        content = re.sub(r'href="/dashboard"', r'href={`/${useParams().tenant}/dashboard`}', content)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed {file_path}')
