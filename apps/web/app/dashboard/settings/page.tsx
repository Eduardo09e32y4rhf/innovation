'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { Image, Save, X } from 'lucide-react';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';

const MAX_LOGO_SIZE = 512 * 1024;

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function readLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const company = useQuery(() => api.companies.me(), []);

  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoError, setLogoError] = useState('');

  useEffect(() => {
    if (company.data) {
      setName(company.data.name ?? '');
      setDocument(company.data.document ?? '');
      setLogoUrl(company.data.logoUrl ?? '');
    }
  }, [company.data]);

  const save = useMutation(
    () => api.companies.update({ name: name.trim() || undefined, document: document.trim() || undefined, logoUrl: logoUrl || undefined }),
    { onSuccess: () => company.refetch() },
  );

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setLogoError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError('Envie um arquivo de imagem.');
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError('A logo precisa ter no maximo 512 KB.');
      return;
    }
    setLogoUrl(await readLogoFile(file));
  }

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
      {logoError && (
        <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">{logoError}</p>
      )}

      <section className="ops-card grid gap-4 rounded-[8px] border border-slate-200 bg-white p-5 sm:grid-cols-[160px_1fr]">
        <div className="space-y-3">
          <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[8px] border border-slate-200 bg-slate-50">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo da empresa" className="h-full w-full object-contain p-3" />
            ) : (
              <Image size={30} className="text-slate-300" />
            )}
          </div>
          <label className="btn-outline flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[8px] px-3 text-xs font-bold">
            <Image size={14} /> Enviar logo
            <input type="file" accept="image/*" onChange={handleLogoChange} className="sr-only" />
          </label>
          {logoUrl && (
            <button type="button" onClick={() => setLogoUrl('')} className="btn-outline flex h-9 w-full items-center justify-center gap-2 rounded-[8px] px-3 text-xs font-bold">
              <X size={13} /> Remover logo
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2">
            <span>Nome da empresa</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={company.loading}
              className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:opacity-50"
            />
          </label>

          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2">
            <span>CNPJ</span>
            <input
              value={document}
              onChange={(e) => setDocument(formatCnpj(e.target.value))}
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
        </div>
      </section>
    </div>
  );
}