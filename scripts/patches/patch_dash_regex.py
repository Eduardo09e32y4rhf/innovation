import re
file_path = 'apps/web/app/dashboard/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'Ver todos os registros .*?</Link>', 'Ver todos os registros &rarr;</Link>', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Regex fixed')
