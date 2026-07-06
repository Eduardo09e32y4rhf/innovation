import sys
import re

file_path = 'apps/web/app/dashboard/time-track/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'Aǟǟ ES': 'AÇÕES',
    'AÇÕES': 'AÇÕES',
    'LANAR': 'LANÇAR',
    'lanar': 'lançar',
    'SA?DA': 'SAÍDA',
    'ALMOO': 'ALMOÇO',
    'OBSERVAǟO': 'OBSERVAÇÃO',
    'FUNCION?RIO': 'FUNCIONÁRIO',
    'funcionǭrio': 'funcionário',
    'VocǦ estǭ': 'Você está',
    'atǸ': 'até',
    'PONTOS PENDENTES DE APROVAǟǟO': 'PONTOS PENDENTES DE APROVAÇÃO',
    'MARCAǟO': 'MARCAÇÃO',
    'SUSPENSǟO': 'SUSPENSÃO',
    'Lanamento': 'Lançamento',
    'Folha Coletiva de Ponto': 'FOLHA DE PONTO',
    'Registros de Ponto Diǟrio': 'Registros de Ponto Diário',
    'Resumo do Perodo': 'Resumo do Período',
    'DIÃ¡RIO': 'DIÁRIO',
    'MÃS': 'MÊS',
    'â': '-',
    'Aǟ\ufffdǟ\ufffd ES': 'AÇÕES',
    'PONTOS PENDENTES DE APROVAǟ\ufffdǟ\ufffdO': 'PONTOS PENDENTES DE APROVAÇÃO',
    'Registros de Ponto Diǟ\ufffdrio': 'Registros de Ponto Diário'
}

for k, v in replacements.items():
    content = content.replace(k, v)
    
# Advanced regex replace for misencoded stuff just in case
content = re.sub(r'A\w+ ES', 'AÇÕES', content) # Might be risky, let's be specific
content = content.replace('A\\u01df\\ufffd\\u01df\\ufffd ES', 'AÇÕES')
content = content.replace('A\xdf\ufffd\xdf\ufffd ES', 'AÇÕES')

# Replace pending UI
old_pending = """<div className="text-xs"><p className="font-bold text-slate-950">{normalizeDisplayName(t.employee?.name ??'-')}</p><p className="text-slate-500">{fmtDateFull(t.date)} - {t.manualReason ?? 'Lançamento manual'}</p></div>"""
new_pending = """<div className="text-xs">
                  <p className="font-black text-slate-950">{normalizeDisplayName(t.employee?.name ??'-')}</p>
                  <p className="text-slate-500 mt-0.5 flex items-center gap-2">
                    <span className="font-semibold">{fmtDateFull(t.date)}</span>
                    <span className="inline-flex items-center rounded-sm bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[9px] font-black text-slate-600">{REASONS.find(r => r.value === t.manualReason)?.label || t.manualReason || 'AJUSTE MANUAL'}</span>
                  </p>
                </div>"""
content = content.replace(old_pending, new_pending)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('page.tsx patched')
