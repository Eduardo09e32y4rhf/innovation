'use client';

import { useEffect, useMemo, useState } from 'react';
import { Monitor, Smartphone, Clock3, UserRound } from 'lucide-react';
import { request } from '@/app/lib/api';

function isMobileUserAgent(userAgent?: string | null) {
  return /Mobile|Android|iPhone|iPad/i.test(userAgent || '');
}

export default function AccessPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    request<any[]>('/platform/online-users').then(setItems).catch((e) => setError(e.message));
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.name, item.email, item.company?.name, item.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [items, search]);

  if (error) return <p className="rounded-[14px] border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar usuario, empresa ou perfil"
          className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-teal-500"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item, index) => (
          <article key={item.id || index} className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
                  <UserRound size={16} className="text-teal-600" />
                  {item.name || item.email}
                </h3>
                <p className="text-sm text-slate-500">{item.company?.name || item.companyName || 'Empresa nao informada'}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-black text-teal-700">
                {isMobileUserAgent(item.userAgent) ? <Smartphone size={12} /> : <Monitor size={12} />}
                {isMobileUserAgent(item.userAgent) ? 'Mobile' : 'Desktop'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Perfil</p>
                <p className="mt-1 font-bold text-slate-900">{item.role || '-'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ultima atividade</p>
                <p className="mt-1 flex items-center gap-1 font-bold text-slate-900">
                  <Clock3 size={12} className="text-teal-600" />
                  {item.lastActiveAt ? new Date(item.lastActiveAt).toLocaleString('pt-BR') : 'Sem registro'}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
