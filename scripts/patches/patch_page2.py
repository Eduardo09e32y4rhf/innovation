import re

file_path = 'apps/web/app/dashboard/time-track/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Using regex to fix the mangled strings based on surrounding context
content = re.sub(r'A.{1,5} ES', 'AÇÕES', content)
content = re.sub(r'SA\.\?DA|SA\?DA|sada', 'SAÍDA', content)
content = re.sub(r'sa.das', 'saídas', content)
content = re.sub(r'FUNCION\.\?RIO|FUNCION\?RIO', 'FUNCIONÁRIO', content)
content = re.sub(r'OBSERVA.ǟO|OBSERVA.O', 'OBSERVAÇÃO', content)
content = re.sub(r'LAN.AR|LANAR', 'LANÇAR', content)
content = re.sub(r'Voc. est.', 'Você está', content)
content = re.sub(r'funcion.rio', 'funcionário', content)
content = re.sub(r'funcion.rios', 'funcionários', content)
content = re.sub(r'atǸ', 'até', content)
content = re.sub(r'MǟSS', 'MÊS', content)
content = re.sub(r'SUSPENSǟO', 'SUSPENSÃO', content)
content = re.sub(r'Lan.amento', 'Lançamento', content)
content = re.sub(r'ALMO.O', 'ALMOÇO', content)
content = re.sub(r'MARCAǟO', 'MARCAÇÃO', content)
content = re.sub(r'sada', 'SAÍDA', content)
content = re.sub(r'OCORRSNCIAS DO M.SS', 'OCORRÊNCIAS DO MÊS', content)
content = re.sub(r'PONTOS PENDENTES DE APROVA.{1,5}O', 'PONTOS PENDENTES DE APROVAÇÃO', content)
content = re.sub(r'lan.ar', 'lançar', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Regex replace complete')
