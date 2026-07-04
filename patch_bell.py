file_path = 'apps/web/app/dashboard/_components/notification-bell.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("n.recipients?.[0]?.status === 'UNREAD'", "(n.recipients?.[0]?.status === 'UNREAD' || n.recipients?.[0]?.status === 'PENDING_RESPONSE')")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Notification bell patched')
