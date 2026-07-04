file_path = 'apps/web/app/dashboard/time-track/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('> FOLHA COLETIVA</button>', '> FOLHAS DE PONTO</button>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Button updated')
