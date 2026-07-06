import codecs

file_path = 'apps/web/app/dashboard/management/page.tsx'

with codecs.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: requiresAcceptance
content = content.replace(
    '''type === 'SUSPENSION' || type === 'WARNING' ? true''',
    '''type === 'SUSPENSION_NOTICE' || type === 'WARNING_NOTICE' ? true'''
)

# Fix 2: docTitle
content = content.replace(
    '''const docTitle = type === 'WARNING' ? 'Aviso''',
    '''const docTitle = type === 'WARNING_NOTICE' ? 'Aviso'''
)

# Fix 3: if (type === 'SUSPENSION') {
content = content.replace(
    '''if (type === 'SUSPENSION') {''',
    '''if (type === 'SUSPENSION_NOTICE') {'''
)

# Fix 4: printPdf
content = content.replace(
    '''type === 'WARNING' ? 'advertencia''',
    '''type === 'WARNING_NOTICE' ? 'advertencia'''
)

# Fix 5: extra fields block
content = content.replace(
    '''{(type === 'WARNING' || type === 'SUSPENSION') && (''',
    '''{(type === 'WARNING_NOTICE' || type === 'SUSPENSION_NOTICE') && ('''
)

# Fix 6: inner suspension condition
content = content.replace(
    '''{type === 'SUSPENSION' && (''',
    '''{type === 'SUSPENSION_NOTICE' && ('''
)

with codecs.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched remaining WARNING and SUSPENSION strings')
