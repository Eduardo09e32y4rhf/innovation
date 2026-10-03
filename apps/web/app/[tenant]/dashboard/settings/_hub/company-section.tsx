'use client';

import { ImageIcon, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';

type Field = { key: string; label: string; span?: boolean; type?: string; placeholder?: string };
const GROUPS: { title: string; fields: Field[] }[] = [
  { title: 'Identificação', fields: [
    { key: 'name', label: 'Nome fantasia' }, { key: 'legalName', label: 'Razão social' },
    { key: 'document', label: 'CNPJ', placeholder: '00.000.000/0000-00' }, { key: 'phone', label: 'Telefone' },
    { key: 'email', label: 'E-mail da empresa', type: 'email' }, { key: 'stateRegistration', label: 'Inscrição estadual' },
    { key: 'municipalRegistration', label: 'Inscrição municipal' },
  ] },
  { title: 'Endereço', fields: [
    { key: 'zipCode', label: 'CEP' }, { key: 'street', label: 'Logradouro', span: true }, { key: 'streetNumber', label: 'Número' },
    { key: 'addressComplement', label: 'Complemento' }, { key: 'neighborhood', label: 'Bairro' }, { key: 'city', label: 'Cidade' }, { key: 'state', label: 'UF' },
  ] },
  { title: 'Representante legal', fields: [
    { key: 'legalRepresentativeName', label: 'Nome completo' }, { key: 'legalRepresentativeCpf', label: 'CPF' },
    { key: 'legalRepresentativeRole', label: 'Cargo' }, { key: 'legalRepresentativeEmail', label: 'E-mail', type: 'email' }, { key: 'legalRepresentativePhone', label: 'Telefone' },
  ] },
];
const KEYS = GROUPS.flatMap((group) => group.fields.map((field) => field.key));
const MAX_LOGO_BYTES = 1_000_000;
const SAFE_LOGO = /^(https:\/\/[^\s?#]+\.(png|jpe?g|webp)(\?[^\s#]*)?(#[^\s]*)?|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$/i;

function formatCnpj(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

export function CompanySection({ canEdit }: { canEdit: boolean }) {
  const company = useQuery(() => api.companies.me(), []);
  const [form, setForm] = useState<Record<string, string>>({});
  const [logo, setLogo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company.data) return;
    const source = company.data as unknown as Record<string, string | null | undefined>;
    setForm(Object.fromEntries(KEYS.map((key) => [key, source[key] ?? ''])));
    setLogo(source.logoUrl ?? '');
  }, [company.data]);

  const source = (company.data ?? {}) as unknown as Record<string, string | null | undefined>;
  const dirty = useMemo(() => KEYS.some((key) => (form[key] ?? '') !== (source[key] ?? '')) || logo !== (source.logoUrl ?? ''), [form, logo, source]);
  const logoError = logo && !SAFE_LOGO.test(logo) ? 'Use uma URL https de imagem (PNG, JPG ou WebP) ou envie um arquivo.' : null;

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return void toast.error('Formato inválido. Use PNG, JPG ou WebP.');
    if (file.size > MAX_LOGO_BYTES) return void toast.error('A imagem deve ter até 1 MB.');
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  }

  async function save() {
    if (logoError) return;
    setSaving(true); setError(null);
    try {
      const payload: Record<string, string | null> = {};
      for (const key of KEYS) payload[key] = (form[key] ?? '').trim();
      if (!payload.name || payload.name.length < 2) { setError('Informe o nome fantasia.'); return; }
      payload.logoUrl = logo.trim() || null;
      await api.companies.update(payload as never);
      toast.success('Dados da empresa salvos.');
      await company.refetch();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  }

  if (company.error) return <ErrorState message={company.error} onRetry={company.refetch} />;
  if (company.loading && !company.data) return <LoadingState label="Carregando empresa…" />;

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
        <section className="card-v2 space-y-3 p-4">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-sub">
            {logo && !logoError ? <img src={logo} alt="Logo da empresa" className="h-full w-full object-contain p-3" /> : <ImageIcon size={36} className="text-fg-mut" aria-hidden="true" />}
          </div>
          {canEdit && (
            <>
              <label className="btn btn-outline btn-md w-full cursor-pointer justify-center">Enviar logo
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              {logo && <Button variant="ghost" size="sm" className="w-full" onClick={() => setLogo('')}><X size={14} aria-hidden="true" /> Remover</Button>}
              <input className="input-v2 w-full text-xs" placeholder="ou cole uma URL https…" value={logo.startsWith('data:') ? '' : logo} onChange={(e) => setLogo(e.target.value)} aria-label="URL do logo" />
              {logoError && <p className="text-xs text-amber-700">{logoError}</p>}
            </>
          )}
        </section>

        <div className="space-y-4">
          {GROUPS.map((group) => (
            <section key={group.title} className="card-v2 p-4">
              <h2 className="mb-3 text-sm font-semibold text-fg">{group.title}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.fields.map((field) => (
                  <label key={field.key} className={`text-xs font-medium text-fg-sub ${field.span ? 'sm:col-span-2' : ''}`}>{field.label}
                    <input type={field.type ?? 'text'} className="input-v2 mt-1 w-full text-sm" disabled={!canEdit} placeholder={field.placeholder}
                      value={form[field.key] ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: field.key === 'document' ? formatCnpj(e.target.value) : e.target.value }))} />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {canEdit && (
        <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-md">
          <span className="text-sm text-fg-sub">{dirty ? 'Há alterações não salvas.' : 'Tudo salvo.'}</span>
          <Button onClick={save} isLoading={saving} disabled={!dirty || Boolean(logoError)}>Salvar</Button>
        </div>
      )}
    </div>
  );
}
