'use client';

import { useState } from 'react';
import { DOCUMENT_CATALOG, DOCUMENT_KITS } from './documents-model';

/** Catalogo de documentos por tipo de contrato: kits prontos + caixinhas por grupo (CLT, PJ, estagio). */
export function DocumentPicker({ value, onChange }: { value: string[]; onChange: (items: string[]) => void }) {
  const [open, setOpen] = useState<string | null>('clt-pessoais');
  const selected = new Set(value.map((item) => item.toLocaleLowerCase('pt-BR')));
  const has = (item: string) => selected.has(item.toLocaleLowerCase('pt-BR'));
  const toggle = (item: string) => onChange(has(item) ? value.filter((entry) => entry.toLocaleLowerCase('pt-BR') !== item.toLocaleLowerCase('pt-BR')) : [...value, item]);
  const addAll = (items: string[]) => onChange([...value, ...items.filter((item) => !has(item))].slice(0, 80));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" aria-label="Kits prontos">
        {DOCUMENT_KITS.map((kit) => (
          <button key={kit.key} type="button" className="min-h-10 rounded-full border border-purple-300 bg-purple-50 px-4 text-sm font-semibold text-purple-800 hover:bg-purple-100" onClick={() => addAll(kit.items)}>+ {kit.title}</button>
        ))}
        {value.length > 0 && <button type="button" className="min-h-10 rounded-full px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50" onClick={() => onChange([])}>Limpar ({value.length})</button>}
      </div>
      <div className="space-y-2">
        {DOCUMENT_CATALOG.map((group) => {
          const count = group.items.filter(has).length;
          const isOpen = open === group.key;
          return (
            <div key={group.key} className="rounded-xl border border-border">
              <button type="button" aria-expanded={isOpen} className="flex min-h-12 w-full items-center justify-between gap-2 px-3 text-left text-sm font-semibold" onClick={() => setOpen(isOpen ? null : group.key)}>
                <span>{group.title}</span>
                <span className="flex items-center gap-2 text-xs text-fg-sub">{count > 0 && <span className="rounded-full bg-purple-600 px-2 py-0.5 font-bold text-white">{count}</span>}{group.items.length} itens {isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="space-y-1 border-t border-border p-2">
                  <button type="button" className="px-2 py-1 text-xs font-semibold text-purple-700 underline" onClick={() => addAll(group.items)}>Marcar todos deste grupo</button>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <li key={item}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-bg-sub">
                          <input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--color-brand)]" checked={has(item)} onChange={() => toggle(item)} /> {item}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-fg-sub">{value.length ? `${value.length} documento(s) selecionado(s).` : 'Nenhum documento selecionado ainda.'}</p>
    </div>
  );
}
