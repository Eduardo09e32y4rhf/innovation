import sys

file_path = 'apps/api/src/modules/users/users.service.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("actor.role", "actor?.role")
content = content.replace("actor.email", "actor?.email")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed users.service.ts')
