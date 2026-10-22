'use client';

import { Search } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

/** Busca com espera de 300 ms (grava na URL só depois que a pessoa para de digitar). */
export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) return;
    const timer = window.setTimeout(() => onChange(text.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [text, value, onChange]);
  return (
    <label className="relative block min-w-0 basis-full sm:basis-72 sm:flex-1 sm:max-w-md">
      <Search size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-fg-sub" aria-hidden="true" />
      <input className="input-v2 w-full !pl-10 text-base sm:text-sm" placeholder={placeholder} aria-label={label} value={text} onChange={(event) => setText(event.target.value)} />
    </label>
  );
}

export function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="input-v2 min-h-11 min-w-0 text-base sm:text-sm">
      {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    </select>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
