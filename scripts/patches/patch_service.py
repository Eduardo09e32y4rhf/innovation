import re

file_path = 'apps/api/src/modules/employees/employees.service.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('pisFirstJob: dto.pisFirstJob,', 'pisFirstJob: dto.firstJob ?? dto.pisFirstJob,')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Service patched')
