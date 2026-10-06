'use client';

import type { SubSection } from './sections';

/** Chips de subsecao: rolagem horizontal no celular, alvos de 44 px, estado atual marcado com aria-current. */
export function SubNav({ items, current, onSelect, label }: { items: SubSection[]; current?: string; onSelect: (key: string) => void; label: string }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto px-1">
      <ul className="flex min-w-max gap-1.5">
        {items.map((item) => (
          <li key={item.key}>
            <button type="button" aria-current={current === item.key ? 'page' : undefined} onClick={() => onSelect(item.key)}
              className={`min-h-11 rounded-lg px-3.5 text-sm font-semibold transition ${current === item.key ? 'bg-purple-600 text-white' : 'border border-border text-fg-sub hover:bg-bg-sub hover:text-fg'}`}>{item.label}</button>
          </li>
        ))}
      </ul>
    </nav>
  );
}