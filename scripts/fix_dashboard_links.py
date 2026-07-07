import os
import re

count = 0
for d, _, files in os.walk('apps/web/app/[tenant]/dashboard'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            path = os.path.join(d, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            original_content = content
            
            # For objects like href: '/dashboard/employees' -> href: `/${useParams().tenant}/dashboard/employees`
            content = re.sub(r"href:\s*'/dashboard([^']*)'", r"href: `/${useParams().tenant}/dashboard\1`", content)
            content = re.sub(r'href:\s*"/dashboard([^"]*)"', r"href: `/${useParams().tenant}/dashboard\1`", content)
            
            # For Link href="/dashboard..." -> href={`/${useParams().tenant}/dashboard...`}
            content = re.sub(r'href="/dashboard([^"]*)"', r"href={`/${useParams().tenant}/dashboard\1`}", content)
            content = re.sub(r"href='/dashboard([^']*)'", r"href={`/${useParams().tenant}/dashboard\1`}", content)
            
            # For router.push('/dashboard...') -> router.push(`/${useParams().tenant}/dashboard...`)
            content = re.sub(r"router\.push\('/dashboard([^']*)'\)", r"router.push(`/${useParams().tenant}/dashboard\1`)", content)
            content = re.sub(r'router\.push\("/dashboard([^"]*)"\)', r"router.push(`/${useParams().tenant}/dashboard\1`)", content)
            
            if content != original_content:
                # Ensure useParams is imported
                if 'useParams' not in content:
                    content = content.replace('import { useRouter', 'import { useRouter, useParams')
                    if 'useParams' not in content:
                        content = 'import { useParams } from "next/navigation";\n' + content
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                count += 1
                print('Fixed links in', path)

print(f'Fixed {count} files.')
