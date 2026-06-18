'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';

export default function SettingsPage() {
  const company = useQuery(() => api.companies.me(), []);

  const [name, setName] = useState('');
  const [document, setDocument] = useState('');

  useEffect(() => {
    if (company.data) {
      setName(company.data.name ?? '');
      setDocument(company.data.document ?? '');
    }
  }, [company.data]);

  const save = useMutation(
    () => api.companies.update({ name: name.trim() || undefined, document: document.trim() || undefined }),
    { onSuccess: () => company.refetch() },
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Configuracoes</p>
        <h2 className="text-2xl font-black text-slate-950">Dados da empresa</h2>
      </header>

      {company.error && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{company.error}</p>
      )}
      {save.error && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{save.error}</p>
      )}

      <section className="ops-card grid gap-4 rounded-[8px] border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Nome da empresa</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={company.loading}
            className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:opacity-50"
          />
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>CNPJ</span>
          <input
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            placeholder="00.000.000/0000-00"
            disabled={company.loading}
            className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:opacity-50"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={() => save.mutate().catch(() => {})}
            disabled={save.loading || company.loading}
            className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            <Save size={14} />
            {save.loading ? 'Salvando...' : 'Salvar configuracoes'}
          </button>
        </div>
      </section>
    </div>
  );
}
