import os

redirect_files = [
    'chat/page.tsx',
    'colaboradores/page.tsx',
    'finance/page.tsx',
    'jobs/page.tsx',
    'media/page.tsx',
    'notifications/page.tsx',
    'ponto/page.tsx',
    'rh/page.tsx',
    'time-track/closing/page.tsx'
]

for f in redirect_files:
    path = os.path.join('apps/web/app/[tenant]/dashboard', f)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        content = content.replace('redirect(//dashboard/whatsapp)', 'redirect(`/${params.tenant}/dashboard/whatsapp`)')
        content = content.replace('redirect(//dashboard/employees)', 'redirect(`/${params.tenant}/dashboard/employees`)')
        content = content.replace('redirect(//dashboard)', 'redirect(`/${params.tenant}/dashboard`)')
        
        with open(path, 'w', encoding='utf-8') as file:
            file.write(content)
        print('Fixed', path)
