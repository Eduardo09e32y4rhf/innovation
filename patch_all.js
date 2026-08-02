const fs = require('fs');

function patchFile(file, replacements) {
    let code = fs.readFileSync(file, 'utf8');
    for (const [search, replace] of replacements) {
        code = code.replace(search, replace);
    }
    fs.writeFileSync(file, code);
}

patchFile('apps/web/app/[tenant]/dashboard/escalas/calendario/page.tsx', [
    [
        '<button onClick={prevMonth} className="btn-icon">\n          <ChevronLeft className="w-5 h-5" />\n        </button>',
        '<button onClick={prevMonth} className="btn-icon" aria-label="Mês anterior" title="Mês anterior">\n          <ChevronLeft className="w-5 h-5" aria-hidden="true" />\n        </button>'
    ],
    [
        '<button onClick={nextMonth} className="btn-icon">\n          <ChevronRight className="w-5 h-5" />\n        </button>',
        '<button onClick={nextMonth} className="btn-icon" aria-label="Próximo mês" title="Próximo mês">\n          <ChevronRight className="w-5 h-5" aria-hidden="true" />\n        </button>'
    ]
]);

patchFile('apps/web/app/[tenant]/dashboard/escalas/equipe/page.tsx', [
    [
        '<button className="btn-icon text-gray-500 hover:text-brand" title="Editar">',
        '<button className="btn-icon text-gray-500 hover:text-brand" aria-label="Editar escala" title="Editar">'
    ],
    [
        '<Edit size={16} />',
        '<Edit size={16} aria-hidden="true" />'
    ],
    [
        'className="btn-icon text-gray-500 hover:text-red-500" \n                        title="Excluir"',
        'className="btn-icon text-gray-500 hover:text-red-500" \n                        aria-label="Excluir escala" \n                        title="Excluir"'
    ],
    [
        '<Trash2 size={16} />',
        '<Trash2 size={16} aria-hidden="true" />'
    ]
]);

patchFile('apps/web/app/[tenant]/dashboard/escalas/ponto/page.tsx', [
    [
        '<button onClick={handlePrevMonth} className="btn-icon p-2 hover:bg-gray-100 rounded-full">',
        '<button onClick={handlePrevMonth} className="btn-icon p-2 hover:bg-gray-100 rounded-full" aria-label="Mês anterior" title="Mês anterior">'
    ],
    [
        '<ChevronLeft size={20} />',
        '<ChevronLeft size={20} aria-hidden="true" />'
    ],
    [
        '<button onClick={handleNextMonth} className="btn-icon p-2 hover:bg-gray-100 rounded-full">',
        '<button onClick={handleNextMonth} className="btn-icon p-2 hover:bg-gray-100 rounded-full" aria-label="Próximo mês" title="Próximo mês">'
    ],
    [
        '<ChevronRight size={20} />',
        '<ChevronRight size={20} aria-hidden="true" />'
    ]
]);

patchFile('apps/web/app/[tenant]/dashboard/escalas/regras/page.tsx', [
    [
        '<button className="btn-icon"><Edit2 className="w-4 h-4" /></button>',
        '<button className="btn-icon" aria-label="Editar regra" title="Editar regra"><Edit2 className="w-4 h-4" aria-hidden="true" /></button>'
    ],
    [
        '<button className="btn-icon text-gray-600 hover:text-red-500" onClick={() => archiveMutation.mutate(rule.id)}>',
        '<button className="btn-icon text-gray-600 hover:text-red-500" onClick={() => archiveMutation.mutate(rule.id)} aria-label="Arquivar regra" title="Arquivar regra">'
    ],
    [
        '<Archive className="w-4 h-4" />',
        '<Archive className="w-4 h-4" aria-hidden="true" />'
    ],
    [
        '<button className="btn-icon text-green-600" onClick={() => activateMutation.mutate(rule.id)}>',
        '<button className="btn-icon text-green-600" onClick={() => activateMutation.mutate(rule.id)} aria-label="Ativar regra" title="Ativar regra">'
    ],
    [
        '<Play className="w-4 h-4" />',
        '<Play className="w-4 h-4" aria-hidden="true" />'
    ],
    [
        '<button className="btn-icon"><Edit2 className="w-4 h-4" /></button>',
        '<button className="btn-icon" aria-label="Editar feriado" title="Editar feriado"><Edit2 className="w-4 h-4" aria-hidden="true" /></button>'
    ],
    [
        '<button className="btn-icon text-red-600 hover:text-red-800" onClick={() => handleDeleteHoliday(holiday.id)}>',
        '<button className="btn-icon text-red-600 hover:text-red-800" onClick={() => handleDeleteHoliday(holiday.id)} aria-label="Excluir feriado" title="Excluir feriado">'
    ],
    [
        '<Archive className="w-4 h-4" />',
        '<Archive className="w-4 h-4" aria-hidden="true" />'
    ]
]);

patchFile('apps/web/app/[tenant]/dashboard/platform/[companyId]/page.tsx', [
    [
        `].map(([id, label, Icon]: any) => <button key={id} onClick={() => setTab(id)} className={\`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-xs font-black transition-all \${tab === id ? 'border-violet-600 text-slate-950 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-700'}\`}><Icon size={14} className={tab === id ? 'text-violet-600' : ''} /> {label}</button>)}`,
        `].map(([id, label, Icon]: any) => <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined} className={\`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-xs font-black transition-all \${tab === id ? 'border-violet-600 text-slate-950 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-700'}\`}><Icon size={14} aria-hidden="true" className={tab === id ? 'text-violet-600' : ''} /> {label}</button>)}`
    ]
]);
