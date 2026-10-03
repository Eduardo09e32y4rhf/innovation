'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { resolveUserRole } from '@/app/lib/user-role';
import { Modal } from '@/app/components/ui/modal';
import { useWorkspace } from './workspace-context';
import { getSearchDestinations, tenantRoute } from './nav-config';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items } = useWorkspace();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  useEffect(() => { if (open) { setQuery(''); setSelected(0); } }, [open]);
  const results = useMemo(() => getSearchDestinations(items, resolveUserRole(user)).filter((item) => normalize(item.label + ' ' + item.group).includes(normalize(query))).slice(0, 20), [items, user, query]);
  const choose = (index: number) => { const destination = results[index]; if (!destination) return; onClose(); router.push(tenantRoute(String(params?.tenant || ''), destination.href)); };
  return <Modal isOpen={open} onClose={onClose} title="Buscar páginas e ações" description="Destinos disponíveis para seu perfil e sua empresa.">
    <div className="relative"><Search size={18} className="absolute left-3 top-3 text-fg-mut" aria-hidden="true" /><input className="input-v2 pl-10" value={query} placeholder="Digite o nome de uma página" aria-label="Buscar páginas e ações" role="combobox" aria-expanded="true" aria-controls="workspace-search-results" aria-autocomplete="list" aria-activedescendant={results[selected] ? 'search-result-' + results[selected].id : undefined}
      onChange={(event) => { setQuery(event.target.value); setSelected(0); }} onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setSelected((value) => results.length ? (value + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length : 0); }
        if (event.key === 'Enter') { event.preventDefault(); choose(selected); }
      }} /></div>
    <div id="workspace-search-results" role="listbox" aria-label="Resultados da busca" className="mt-3 max-h-[50dvh] space-y-1 overflow-y-auto">
      {results.length ? results.map((item, index) => <button id={'search-result-' + item.id} key={item.id} role="option" aria-selected={selected === index} type="button" tabIndex={-1} onClick={() => choose(index)} className={'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left ' + (selected === index ? 'bg-bg-sub text-fg' : 'text-fg-mut')}><item.icon size={18} aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="text-xs text-fg-mut">{item.group}</span></span></button>) : <p className="py-6 text-center text-sm text-fg-mut" role="status">Nenhum resultado para esta busca.</p>}
    </div>
  </Modal>;
}
