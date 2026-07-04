import re

file_path = 'apps/web/app/dashboard/time-track/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any lingering mangled text using more specific replacements
content = content.replace('A\xdf\ufffd\xdf\ufffd ES', 'AÇÕES')
content = content.replace('A\u01df\ufffd\u01df\ufffd ES', 'AÇÕES')
content = content.replace('Aǟǟ ES', 'AÇÕES')
content = content.replace('OBSERVAǟO', 'OBSERVAÇÃO')
content = content.replace('Lanamento', 'Lançamento')
content = content.replace('funcionǭrio', 'funcionário')
content = content.replace('funcionǭrios', 'funcionários')
content = content.replace('atǸ', 'até')
content = content.replace('MǟSS', 'MÊS')
content = content.replace('sada', 'saída')
content = content.replace('SA?DA', 'SAÍDA')
content = content.replace('FUNCION?RIO', 'FUNCIONÁRIO')
content = content.replace('ALMOO', 'ALMOÇO')
content = content.replace('lanar', 'lançar')
content = content.replace('VocǦ', 'Você')
content = content.replace('estǭ', 'está')
content = content.replace('LANAR', 'LANÇAR')
content = content.replace('MARCAǟO', 'MARCAÇÃO')
content = content.replace('SUSPENSǟO', 'SUSPENSÃO')
content = content.replace('PONTOS PENDENTES DE APROVAǟǟO', 'PONTOS PENDENTES DE APROVAÇÃO')
content = content.replace('Responsǭvel', 'Responsável')
content = content.replace('Perodo', 'Período')
content = content.replace('Registros de Ponto Diǟrio', 'Registros de Ponto Diário')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Cleanup complete')
