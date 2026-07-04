import codecs

file_path = 'apps/api/src/modules/notifications/notifications.service.ts'

with codecs.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '''if (type === 'SUSPENSION' &&''',
    '''if (type === 'SUSPENSION_NOTICE' &&'''
)
content = content.replace(
    '''incidentType: 'SUSPENSÃO',''',
    '''incidentType: 'SUSPENSÃO','''
)

with codecs.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Types patched in backend')
