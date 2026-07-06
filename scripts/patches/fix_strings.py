import re

file_path = 'apps/web/app/dashboard/vacations/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'FǸrias': 'Férias',
    'Matrcula': 'Matrícula',
    'Admissǜo': 'Admissão',
    'Cǭlculos Bǭsicos': 'Cálculos Básicos',
    'Descriǜo / Rubrica': 'Descrição / Rubrica',
    'Remuneraǜo': 'Remuneração',
    'Lquido a Receber': 'Líquido a Receber',
    'disposies legais': 'disposições legais',
    'serǜo concedidas': 'serão concedidas',
    'perodo aquisitivo': 'período aquisitivo',
    'importǽncia lquida': 'importância líquida',
    'quitaǜo': 'quitação',
    '1/3 Constitucional s/ FǸrias': '1/3 Constitucional s/ Férias',
    'Aviso e Recibo de FǸrias': 'Aviso e Recibo de Férias',
    'Perodo de FǸrias': 'Período de Férias',
    'Incio do Gozo': 'Início do Gozo',
    'TǸrmino do Gozo': 'Término do Gozo',
    'impressǜo do recibo': 'impressão do recibo',
    'Aviso e Recibo de Frias': 'Aviso e Recibo de Férias',
    'Incio': 'Início',
    'TǸrmino': 'Término',
    'importǽncia': 'importância',
    'quitaǜo': 'quitação',
    'Lquido': 'Líquido',
    'lquida': 'líquida',
    'Perodo': 'Período',
    'perodo': 'período',
    '?"': '---'
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Mangled strings fixed')
