import re

file_path = 'apps/api/src/modules/notifications/notifications.service.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("status: 'UNREAD'", "status: { in: ['UNREAD', 'PENDING_RESPONSE'] }")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Notifications service patched')
