'use client';

import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Save } from 'lucide-react';
import { Button } from '@/app/components/ui';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api, type Company } from '@/app/lib/api';

const groups = [
  { title: 'Identidade e contato', fields: [
    ['name', 'Nome fantasia', 'text'], ['legalName', 'Razão social', 'text'], ['document', 'CNPJ', 'text'],
    ['phone', 'Telefone', 'tel'], ['email', 'E-mail da empresa', 'email'],
  ] },
  { title: 'Inscrições', fields: [['stateRegistration', 'Inscrição estadual', 'text'], ['municipalRegistration', 'Inscrição municipal', 'text']] },
  { title: 'Endereço', fields: [
    ['zipCode', 'CEP', 'text'], ['street', 'Logradouro', 'text'], ['streetNumber', 'Número', 'text'],
    ['addressComplement', 'Complemento', 'text'], ['neighborhood', 'Bairro', 'text'], ['city', 'Cidade', 'text'], ['state', 'Estado (UF)', 'text'],
  ] },
  { title: 'Representante legal', fields: [
    ['legalRepresentativeName', 'Nome completo', 'text'], ['legalRepresentativeCpf', 'CPF', 'text'],
    ['legalRepresentativeRole', 'Cargo ou função', 'text'], ['legalRepresentativeEmail', 'E-mail', 'email'], ['legalRepresentativePhone', 'Telefone', 'tel'],
  ] },
] as const;
const editable = [...groups.flatMap(group => group.fields.map(field => field[0])), 'logoUrl'] as const;
const logoPattern = /^https:\/\/[^\s?#]+\.(png|jpe?g|webp)(\?[^\s#]*)?(#[^\s]*)?$/i;
export function validateCompanyLogo(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) return trimmed.length <= 5_000_000 ? '' : 'A imagem excede o tamanho permitido pelo servidor.';
  if (trimmed.length > 2048) return 'A URL deve ter no máximo 2.048 caracteres.';
  return logoPattern.test(trimmed) ? '' : 'Use uma URL HTTPS de PNG, JPG ou WebP. SVG não é aceito.';
}
function cnpj(value: string) {
  return value.replace(/\D/g, '').slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}
export function CompanySettingsSection() {
  const company = useQuery(() => api.companies.me(), []);
  const { refreshUser } = useAuth();
  const [baseline, setBaseline] = useState<Company | null>(null);
  const [draft, setDraft] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [brokenLogo, setBrokenLogo] = useState(false);
  const [readingLogo, setReadingLogo] = useState(false);
  const logoRead = useRef(0);
  useEffect(() => { if (company.data && !baseline) { setBaseline(company.data); setDraft(company.data); } }, [company.data, baseline]);
  useEffect(() => { setBrokenLogo(false); }, [draft?.logoUrl]);
  useEffect(() => () => { logoRead.current += 1; }, []);
  const changed = !!draft && !!baseline && editable.some(key => (draft[key] ?? '') !== (baseline[key] ?? ''));
  const logoError = validateCompanyLogo(draft?.logoUrl ?? '');
  function update(key: keyof Company, value: string | null) { setDraft(current => current ? { ...current, [key]: value } : current); setSuccess(''); }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || !baseline || !changed || logoError || busy.current || readingLogo) return;
    const payload: Partial<Company> = {};
    for (const key of editable) {
      if ((draft[key] ?? '') !== (baseline[key] ?? '')) payload[key] = key === 'logoUrl' ? draft[key]?.trim() || null : draft[key]?.trim() ?? '';
    }
    busy.current = true; setSaving(true); setError(''); setSuccess('');
    try {
      const updated = await api.companies.update(payload);
      setDraft(updated); setBaseline(updated); company.refetch(); setSuccess('Configurações da empresa salvas.');
      try { await refreshUser(); } catch { setSuccess('Configurações salvas. Atualize a página para recarregar o contexto da empresa.'); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar as configurações.'); }
    finally { busy.current = false; setSaving(false); }
  }
  function readLogo(file?: File) {
    if (!file) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Selecione uma imagem PNG, JPG ou WebP.'); return; }
    if (file.size > 3 * 1024 * 1024) { setError('A imagem deve ter até 3 MB.'); return; }
    const requestId = ++logoRead.current;
    setReadingLogo(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (requestId !== logoRead.current) return;
      update('logoUrl', String(reader.result)); setReadingLogo(false);
    };
    reader.onerror = () => { if (requestId === logoRead.current) { setError('Não foi possível ler a imagem. Selecione o arquivo novamente.'); setReadingLogo(false); } };
    reader.readAsDataURL(file);
  }
  if (company.loading && !draft) return <LoadingState label="Carregando dados da empresa..." />;
  if (company.error && !draft) return <ErrorState message={company.error} onRetry={company.refetch} />;
  if (!draft) return null;
  return <section className="card-v2 p-4 sm:p-6">
    <h2 className="text-lg font-semibold text-fg">Configurações da empresa</h2>
    <p className="mt-1 text-sm text-fg-mut">Revise a identidade, o endereço e os dados contratuais da empresa atual.</p>
    <form onSubmit={save} className="mt-5 space-y-6">
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
      {company.error && <p role="alert" className="text-sm text-amber-800">Os dados foram salvos, mas não foi possível atualizar a consulta: {company.error}</p>}
      {groups.map(group => <fieldset key={group.title} disabled={saving} className="space-y-4 border-t border-border pt-4">
        <legend className="pr-2 text-base font-semibold">{group.title}</legend>
        <div className="grid gap-4 sm:grid-cols-2">{group.fields.map(([key, label, type]) => <label key={key} className="block space-y-2 text-sm font-medium text-fg">
          <span>{label}{key === 'name' ? ' *' : ''}</span>
          <input type={type} value={draft[key] ?? ''} required={key === 'name'} minLength={key === 'name' ? 2 : undefined}
            maxLength={key === 'state' ? 2 : undefined} inputMode={['document', 'zipCode', 'legalRepresentativeCpf'].includes(key) ? 'numeric' : undefined}
            onChange={event => update(key, key === 'document' ? cnpj(event.target.value) : key === 'state' ? event.target.value.toUpperCase() : event.target.value)}
            className="input-v2 min-h-11 w-full text-base sm:text-sm" />
        </label>)}</div>
      </fieldset>)}
      <fieldset disabled={saving || readingLogo} className="space-y-4 border-t border-border pt-4">
        <legend className="pr-2 text-base font-semibold">Logo da empresa</legend>
        <div className="grid gap-4 sm:grid-cols-[128px_minmax(0,1fr)]">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-sub">
            {draft.logoUrl && !logoError && !brokenLogo ? <img src={draft.logoUrl} alt="Prévia do logo da empresa" width={128} height={128} className="h-full w-full object-contain p-2" onError={() => setBrokenLogo(true)} /> : <ImageIcon size={32} aria-hidden="true" className="text-fg-mut" />}
          </div>
          <div className="min-w-0 space-y-3">
            <label className="block space-y-2 text-sm font-medium"><span>URL do logo</span>
              <input value={draft.logoUrl?.startsWith('data:') ? '' : draft.logoUrl ?? ''} onChange={event => update('logoUrl', event.target.value)}
                placeholder="https://empresa.com/logo.png" aria-invalid={!!logoError} aria-describedby="company-logo-help" className="input-v2 min-h-11 text-base sm:text-sm" />
            </label>
            <label className="block space-y-2 text-sm font-medium"><span>Selecionar imagem local</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="input-v2 min-h-11 w-full text-base sm:text-sm"
                onChange={event => { readLogo(event.target.files?.[0]); event.target.value = ''; }} />
            </label>
            <p id="company-logo-help" className={`text-sm ${logoError ? 'text-rose-700' : 'text-fg-mut'}`}>{logoError || 'PNG, JPG ou WebP, até 3 MB. A imagem local será salva junto às configurações.'}</p>
            {brokenLogo && <p role="status" className="text-sm text-amber-800">Não foi possível carregar a prévia. Verifique o endereço da imagem.</p>}
            {draft.logoUrl && <Button type="button" variant="outline" onClick={() => update('logoUrl', null)}>Remover logo</Button>}
          </div>
        </div>
      </fieldset>
      {readingLogo && <p role="status" className="text-sm text-fg-mut">Lendo imagem...</p>}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" isLoading={saving} disabled={!changed || !!logoError || readingLogo}><Save size={18} aria-hidden="true" />Salvar configurações</Button>
        <Button type="button" variant="outline" disabled={!changed || saving || readingLogo} onClick={() => { setDraft(baseline); setError(''); setSuccess(''); }}>Cancelar edição</Button>
        {changed && <p role="status" className="text-sm text-amber-800">Há alterações não salvas.</p>}
      </div>
    </form>
  </section>;
}
