import os

files = [
    r'apps/web/app/settings/page.tsx',
    r'apps/web/app/time-track/page.tsx',
    r'apps/web/app/users/page.tsx',
    r'apps/web/app/vacations/page.tsx',
    r'apps/web/app/whatsapp/page.tsx'
]

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'use client' not in content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write("'use client';\n" + content)
            print(f"Fixed {filepath}")
