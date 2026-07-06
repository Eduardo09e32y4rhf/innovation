import re
import codecs

file_path = 'apps/web/app/dashboard/management/page.tsx'

with codecs.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '''<option value="WARNING">Advertência</option>''',
    '''<option value="WARNING_NOTICE">Advertência</option>'''
)
content = content.replace(
    '''<option value="SUSPENSION">Suspensão</option>''',
    '''<option value="SUSPENSION_NOTICE">Suspensão</option>'''
)
content = content.replace(
    '''<option value="SYSTEM_ALERT">Alerta do Sistema</option>''',
    '''<option value="SYSTEM_NOTICE">Alerta do Sistema</option>'''
)
content = content.replace(
    '''type === 'WARNING' || type === 'SUSPENSION' ? 'DESCREVA OS DETALHES''',
    '''type === 'WARNING_NOTICE' || type === 'SUSPENSION_NOTICE' ? 'DESCREVA OS DETALHES'''
)
content = content.replace(
    '''type === 'WARNING' || type === 'SUSPENSION' ? true''',
    '''type === 'WARNING_NOTICE' || type === 'SUSPENSION_NOTICE' ? true'''
)
content = content.replace(
    '''type === 'WARNING' || type === 'SUSPENSION' ? false''',
    '''type === 'WARNING_NOTICE' || type === 'SUSPENSION_NOTICE' ? false'''
)
content = content.replace(
    '''type === 'WARNING' ? 'GERAR ADVERT''',
    '''type === 'WARNING_NOTICE' ? 'GERAR ADVERT'''
)
content = content.replace(
    '''type === 'SUSPENSION' ? 'GERAR SUSPENS''',
    '''type === 'SUSPENSION_NOTICE' ? 'GERAR SUSPENS'''
)
content = content.replace(
    '''const extraJson = (type === 'WARNING' || type === 'SUSPENSION') ? {''',
    '''const extraJson = (type === 'WARNING_NOTICE' || type === 'SUSPENSION_NOTICE') ? {'''
)
content = content.replace(
    '''<label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600">
            <span>{type === 'WARNING_NOTICE' || type === 'SUSPENSION_NOTICE' ? 'DESCREVA OS DETALHES DA INFRAÇÃO (APARECERÁ NO PDF E NO APP)' : 'MENSAGEM'}</span>''',
    '''<label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600">
            <span>{type === 'WARNING_NOTICE' || type === 'SUSPENSION_NOTICE' ? 'DESCREVA OS DETALHES DA INFRAÇÃO (OPCIONAL)' : 'MENSAGEM (OPCIONAL)'}</span>'''
)
content = content.replace(
    '''useState<'SIMPLE_NOTICE' | 'WARNING' | 'SUSPENSION' | 'SYSTEM_ALERT'>''',
    '''useState<'SIMPLE_NOTICE' | 'WARNING_NOTICE' | 'SUSPENSION_NOTICE' | 'SYSTEM_NOTICE'>'''
)

with codecs.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Types patched in frontend')
