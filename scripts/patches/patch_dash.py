file_path = 'apps/web/app/dashboard/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Ver todos os registros â¦´', 'Ver todos os registros →')
content = content.replace('Ver todos os registros \u00e2\u00a6\u00b4', 'Ver todos os registros →')
content = content.replace('Ver todos os registros \xe2\xa6\xb4', 'Ver todos os registros →')
content = content.replace('â¦´', '→')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Dashboard encoding fixed')
