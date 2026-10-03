'use client';

import { Building2, Check, ChevronDown, Globe2, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { platformHub } from './hub-api';
import type { CompanyOption } from './types';

export function ScopePicker({ selected, onSelect }: { selected: CompanyOption | null; onSelect: (company: CompanyOption | null) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timer = setTimeout(() => {
      platformHub.companies(query.trim() || undefined).then(setOptions).catch(() => setOptions([])).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex min-h-11 w-full min-w-[260px] items-center gap-2 rounded-xl border border-border bg-bg-elev px-3 py-2 text-left text-sm shadow-sm hover:border-purple-400">
        {selected ? <Building2 size={16} className="text-purple-700" aria-hidden="true" /> : <Globe2 size={16} className="text-purple-700" aria-hidden="true" />}
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] uppercase tracking-wide text-fg-sub">Visão</span>
          <span className="block truncate font-semibold">{selected ? selected.name : 'Toda a plataforma'}</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 min-w-[300px] rounded-xl border border-border bg-bg-elev p-2 shadow-xl">
          <div className="relative mb-2">
            <Search size={15} className="pointer-events-none absolute left-3 top-3 text-fg-sub" aria-hidden="true" />
            <input autoFocus className="input-v2 !pl-9 w-full text-sm" placeholder="Buscar empresa por nome ou CNPJ" aria-label="Buscar empresa" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <ul role="listbox" className="max-h-72 space-y-0.5 overflow-y-auto">
            <li>
              <button type="button" role="option" aria-selected={!selected} onClick={() => { onSelect(null); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-bg-sub">
                <Globe2 size={15} aria-hidden="true" /><span className="flex-1 font-medium">Toda a plataforma</span>{!selected && <Check size={15} aria-hidden="true" />}
              </button>
            </li>
            {options.map((company) => (
              <li key={company.id}>
                <button type="button" role="option" aria-selected={selected?.id === company.id} onClick={() => { onSelect(company); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-bg-sub">
                  <Building2 size={15} aria-hidden="true" />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{company.name}</span><span className="block truncate text-xs text-fg-sub">{company.document || company.slug}</span></span>
                  {selected?.id === company.id && <Check size={15} aria-hidden="true" />}
                </button>
              </li>
            ))}
            {!loading && options.length === 0 && <li className="px-3 py-4 text-center text-sm text-fg-sub">Nenhuma empresa encontrada.</li>}
            {loading && <li className="px-3 py-4 text-center text-sm text-fg-sub">Buscando…</li>}
          </ul>
        </div>
      )}
      {selected && (
        <button type="button" onClick={() => onSelect(null)} className="absolute -right-2 -top-2 rounded-full border border-border bg-bg-elev p-1 text-fg-sub shadow hover:text-fg" aria-label="Voltar para a visão geral da plataforma"><X size={12} /></button>
      )}
    </div>
  );
}
