'use client';

import { useEffect, useMemo, useState } from 'react';
import { Image, Save, X } from 'lucide-react';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';

const SAFE_LOGO_URL = /^https:\/\/[^\s?#]+\.(png|jpe?g|webp)(\?[^\s#]*)?(#[^\s]*)?$/i;
const MAX_LOGO_URL_LENGTH = 2048;

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function validateLogoUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length > MAX_LOGO_URL_LENGTH) return 'A URL da logo precisa ter no maximo 2048 caracteres.';
  if (trimmed.startsWith('data:')) return 'Nao salve base64 no banco. Use uma URL HTTPS da imagem.';
  if (/\.svg(\?|#|$)/i.test(trimmed)) return 'SVG esta bloqueado por seguranca. Use PNG, JPG ou WebP.';
  if (!SAFE_LOGO_URL.test(trimmed)) return 'Use uma URL HTTPS terminando em PNG, JPG, JPEG ou WebP.';
  return '';
}

export default function SettingsPage() {
  const company = useQuery(() => api.companies.me(), []);

  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [removeLogo, setRemoveLogo] = useState(false);

  useEffect(() => {
    if (company.data) {
      setName(company.data.name ?? '');
      setDocument(company.data.document ?? '');
      setLogoUrl(company.data.logoUrl ?? '');
      setRemoveLogo(false);
    }
  }, [company.data]);

  const logoError = useMemo(() => (removeLogo ? '' : validateLogoUrl(logoUrl)), [logoUrl, removeLogo]);
  const previewLogo = !removeLogo && !logoError && logoUrl.trim() ? logoUrl.trim() : '';

  const save = useMutation(
    () => api.companies.update({
      name: name.trim() || undefined,
      document: document.trim() || undefined,
      logoUrl: removeLogo ? null : logoUrl.trim() || undefined,
    }),
    { onSuccess: () => company.refetch() },
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Configurações</p>
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
            {previewLogo ? (
              <img src={previewLogo} alt="Logo da empresa" className="h-full w-full object-contain p-3" />
            ) : (
              <Image size={30} className="text-slate-300" />
            )}
          </div>
          {company.data?.logoUrl && !removeLogo && (
            <button type="button" onClick={() => setRemoveLogo(true)} className="btn-outline flex h-9 w-full items-center justify-center gap-2 rounded-[8px] px-3 text-xs font-bold">
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

          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2">
            <span>URL HTTPS da logo</span>
            <input
              value={removeLogo ? '' : logoUrl}
              onChange={(e) => { setRemoveLogo(false); setLogoUrl(e.target.value); }}
              placeholder="https://seudominio.com/logo.png"
              disabled={company.loading}
              className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:opacity-50"
            />
            <span className="block text-[11px] text-slate-400">PNG, JPG ou WebP. SVG e base64 ficam bloqueados.</span>
          </label>

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => !logoError && save.mutate().catch(() => {})}
              disabled={Boolean(logoError) || save.loading || company.loading}
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