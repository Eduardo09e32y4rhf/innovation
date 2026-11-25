'use client';

import { ImageIcon, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { cardClass, errorText, inputClass } from './types';
import { useI18n } from '@/app/contexts/I18nContext';

type Mask = 'cnpj' | 'cpf' | 'cep' | 'phone' | 'uf';
type Field = { key: string; label: string; span?: boolean; type?: string; placeholder?: string; mask?: Mask };

const GROUPS: { title: string; hint?: string; fields: Field[] }[] = [
  { title: 'Identificação', hint: 'Digite o CNPJ completo e os dados são buscados na Receita.', fields: [
    { key: 'document', label: 'CNPJ', placeholder: '00.000.000/0000-00', mask: 'cnpj' }, { key: 'legalName', label: 'Razão social', span: true },
    { key: 'name', label: 'Nome fantasia', span: true }, { key: 'phone', label: 'Telefone', mask: 'phone' }, { key: 'email', label: 'E-mail da empresa', type: 'email' },
    { key: 'stateRegistration', label: 'Inscrição estadual' }, { key: 'municipalRegistration', label: 'Inscrição municipal' },
  ] },
  { title: 'Endereço', hint: 'Digite o CEP e o endereço é preenchido sozinho.', fields: [
    { key: 'zipCode', label: 'CEP', placeholder: '00000-000', mask: 'cep' }, { key: 'street', label: 'Rua / avenida', span: true }, { key: 'streetNumber', label: 'Número' },
    { key: 'addressComplement', label: 'Complemento' }, { key: 'neighborhood', label: 'Bairro' }, { key: 'city', label: 'Cidade' }, { key: 'state', label: 'UF', mask: 'uf' },
  ] },
  { title: 'Representante legal', fields: [
    { key: 'legalRepresentativeName', label: 'Nome completo', span: true }, { key: 'legalRepresentativeCpf', label: 'CPF', mask: 'cpf', placeholder: '000.000.000-00' },
    { key: 'legalRepresentativeRole', label: 'Cargo' }, { key: 'legalRepresentativeEmail', label: 'E-mail', type: 'email' }, { key: 'legalRepresentativePhone', label: 'Telefone', mask: 'phone' },
  ] },
];
const KEYS = GROUPS.flatMap((group) => group.fields.map((field) => field.key));
const MAX_LOGO_BYTES = 1_000_000;
const SAFE_LOGO = /^(https:\/\/[^\s?#]+\.(png|jpe?g|webp)(\?[^\s#]*)?(#[^\s]*)?|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$/i;

function applyMask(mask: Mask | undefined, value: string) {
  const d = value.replace(/\D/g, '');
  switch (mask) {
    case 'cnpj': return d.slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
    case 'cpf': return d.slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    case 'cep': return d.slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
    case 'phone': return maskPhone(value);
    case 'uf': return value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
    default: return value;
  }
}

function normalizePhoneDigits(value: string, defaultCountry = '55') {
  const trimmed = value.trim();
  if (!trimmed) return '';
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  if (trimmed.startsWith('00')) {
    digits = digits.slice(2);
  } else if (!trimmed.startsWith('+') && digits.length <= 11 && !digits.startsWith(defaultCountry)) {
    digits = `${defaultCountry}${digits}`;
  }

  return digits.slice(0, 15);
}

function maskPhone(value: string) {
  const digits = normalizePhoneDigits(value);
  if (!digits) return '';

  if (digits.startsWith('55') && digits.length > 2) {
    const country = digits.slice(0, 2);
    const area = digits.slice(2, 4);
    const local = digits.slice(4);
    if (!area) return `+${country}`;
    if (local.length <= 4) return `+${country} (${area}) ${local}`.trim();
    if (local.length <= 8) return `+${country} (${area}) ${local.slice(0, 4)}-${local.slice(4)}`;
    return `+${country} (${area}) ${local.slice(0, 5)}-${local.slice(5)}`;
  }

  const countryLength = digits.length > 11 ? (digits.startsWith('1') ? 1 : digits.length >= 13 ? 3 : 2) : 1;
  const country = digits.slice(0, countryLength);
  const rest = digits.slice(countryLength);
  if (!rest) return `+${country}`;

  const areaLength = rest.length > 8 ? 2 : 0;
  const area = areaLength ? rest.slice(0, areaLength) : '';
  const local = areaLength ? rest.slice(areaLength) : rest;
  const grouped =
    local.length > 6
      ? `${local.slice(0, local.length - 4)}-${local.slice(-4)}`
      : local.length > 4
        ? `${local.slice(0, 3)} ${local.slice(3)}`
        : local;

  return area ? `+${country} (${area}) ${grouped}` : `+${country} ${grouped}`;
}

export function CompanySection({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n();
  const company = useQuery(() => api.companies.me(), []);
  const [form, setForm] = useState<Record<string, string>>({});
  const [logo, setLogo] = useState('');
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const lookupId = useRef({ cep: 0, cnpj: 0 });

  useEffect(() => {
    if (!company.data) return;
    const source = company.data as unknown as Record<string, string | null | undefined>;
    setForm(Object.fromEntries(KEYS.map((key) => {
      const value = source[key] ?? source[key === 'zipCode' ? 'cep' : key === 'document' ? 'cnpj' : key] ?? '';
      return [key, key === 'phone' || key === 'legalRepresentativePhone' ? maskPhone(value) : value];
    })));
    setLogo(source.logoUrl ?? '');
    // Empresa com CNPJ mas sem razão social: busca na Receita sozinho, sem esperar digitar.
    const digits = String(source.document ?? source.cnpj ?? '').replace(/\D/g, '');
    if (canEdit && digits.length === 14 && !source.legalName) void lookupCnpj(digits);
    // lookupCnpj só usa refs e setters estáveis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.data]);

  const source = useMemo(
    () => (company.data ?? {}) as unknown as Record<string, string | null | undefined>,
    [company.data],
  );
  const dirty = useMemo(() => KEYS.some((key) => {
    const sourceValue = source[key] ?? source[key === 'zipCode' ? 'cep' : key === 'document' ? 'cnpj' : key] ?? '';
    const comparableSource = key === 'phone' || key === 'legalRepresentativePhone' ? maskPhone(sourceValue) : sourceValue;
    return (form[key] ?? '') !== comparableSource;
  }) || logo !== (source.logoUrl ?? ''), [form, logo, source]);
  const logoError = logo && !SAFE_LOGO.test(logo) ? t('Use uma URL https de imagem (PNG, JPG ou WebP) ou envie um arquivo.') : null;
  const patch = (change: Record<string, string>) => setForm((prev) => ({ ...prev, ...change }));

  async function lookupCep(digits: string) {
    const id = ++lookupId.current.cep;
    setHint((h) => ({ ...h, zipCode: t('Buscando endereço…') }));
    try {
      const data = await api.lookup.cep(digits);
      if (id !== lookupId.current.cep) return;
      patch({ street: data.street || '', neighborhood: data.neighborhood || '', city: data.city || '', state: data.state || '' });
      setHint((h) => ({ ...h, zipCode: t('Endereço preenchido. Confira número e complemento.') }));
    } catch (cause) { if (id === lookupId.current.cep) setHint((h) => ({ ...h, zipCode: errorText(cause, t('Não foi possível buscar o CEP. Preencha à mão.')) })); }
  }

  async function lookupCnpj(digits: string) {
    const id = ++lookupId.current.cnpj;
    setHint((h) => ({ ...h, document: t('Consultando CNPJ…') }));
    try {
      const data = await api.lookup.cnpj(digits);
      if (id !== lookupId.current.cnpj) return;
      // O CNPJ digitado manda: os dados da Receita substituem os atuais (o que a Receita não informa fica como está).
      setForm((prev) => ({
        ...prev,
        legalName: data.legalName || prev.legalName, name: data.tradeName || data.legalName || prev.name,
        zipCode: data.cep ? applyMask('cep', data.cep) : prev.zipCode, street: data.street || prev.street, streetNumber: data.streetNumber || prev.streetNumber,
        addressComplement: data.addressComplement || prev.addressComplement, neighborhood: data.neighborhood || prev.neighborhood, city: data.city || prev.city, state: data.state || prev.state,
        phone: data.phone ? applyMask('phone', data.phone) : prev.phone, email: data.email || prev.email,
      }));
      setHint((h) => ({ ...h, document: t('Dados da Receita preenchidos. Confira antes de salvar.') }));
    } catch (cause) { if (id === lookupId.current.cnpj) setHint((h) => ({ ...h, document: errorText(cause, t('Não foi possível consultar o CNPJ. Preencha à mão.')) })); }
  }

  function change(field: Field, raw: string) {
    const value = applyMask(field.mask, raw);
    patch({ [field.key]: value });
    const digits = value.replace(/\D/g, '');
    if (field.key === 'zipCode' && digits.length === 8) void lookupCep(digits);
    if (field.key === 'document' && digits.length === 14) void lookupCnpj(digits);
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return void toast.error(t('Formato inválido. Use PNG, JPG ou WebP.'));
    if (file.size > MAX_LOGO_BYTES) return void toast.error(t('A imagem deve ter até 1 MB.'));
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      // Os PDFs só embutem PNG e JPEG: WebP vira PNG aqui, para a logo aparecer em faturas, holerites e demais documentos.
      if (file.type !== 'image/webp') return setLogo(result);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        canvas.getContext('2d')?.drawImage(image, 0, 0);
        const png = canvas.toDataURL('image/png');
        if (png.length > MAX_LOGO_BYTES * 1.4) return void toast.error(t('A imagem convertida ficou grande demais. Use PNG ou JPG de até 1 MB.'));
        setLogo(png);
      };
      image.onerror = () => toast.error(t('Não foi possível ler a imagem WebP. Use PNG ou JPG.'));
      image.src = result;
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    if (logoError) return;
    setError(null);
    const payload: Record<string, string | null> = {};
    for (const key of KEYS) {
      const value = (form[key] ?? '').trim();
      payload[key] = key === 'phone' || key === 'legalRepresentativePhone' ? normalizePhoneDigits(value) : value;
    }
    if (!payload.name || payload.name.length < 2) return setError(t('Informe o nome fantasia da empresa.'));
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return setError(t('O e-mail da empresa não é válido.'));
    setSaving(true);
    try {
      payload.logoUrl = logo.trim() || null;
      await api.companies.update(payload as never);
      toast.success(t('Dados da empresa salvos.'));
      await company.refetch();
      window.dispatchEvent(new Event('company-updated'));
    } catch (cause) { setError(errorText(cause, t('Não foi possível salvar os dados da empresa.'))); }
    finally { setSaving(false); }
  }

  if (company.error) return <ErrorState message={company.error} onRetry={company.refetch} />;
  if (company.loading && !company.data) return <LoadingState label={t('Carregando empresa…')} />;

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
      {!canEdit && <p className="rounded-xl bg-bg-sub px-3 py-2 text-sm text-fg-sub">{t('Somente o RH ou o administrador podem alterar os dados da empresa.')}</p>}

      <section className={`${cardClass} flex flex-wrap items-center gap-5`}>
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-bg-sub">
          {logo && !logoError ? <img src={logo} alt={t('Logo da empresa')} className="h-full w-full object-contain p-2" /> : <ImageIcon size={32} className="text-fg-mut" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-base font-bold text-fg">{t('Logo da empresa')}</h3>
          <p className="text-xs text-fg-sub">{t('Aparece nos documentos e PDFs. PNG, JPG ou WebP, até 1 MB.')}</p>
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="btn btn-outline btn-md cursor-pointer">{t('Enviar imagem')}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              {logo && <Button variant="ghost" size="sm" onClick={() => setLogo('')}><X size={14} aria-hidden="true" /> {t('Remover')}</Button>}
            </div>
          )}
          {logoError && <p className="text-xs font-semibold text-amber-700">{logoError}</p>}
        </div>
      </section>

      {GROUPS.map((group) => (
        <section key={group.title} className={cardClass}>
          <h3 className="text-base font-bold text-fg">{t(group.title)}</h3>
          {group.hint && <p className="mb-3 flex items-center gap-1.5 text-xs text-fg-sub"><Search size={12} aria-hidden="true" /> {t(group.hint)}</p>}
          <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${group.hint ? '' : 'mt-3'}`}>
            {group.fields.map((field) => (
              <label key={field.key} className={`text-xs font-semibold text-fg-sub ${field.span ? 'sm:col-span-2' : ''}`}>{t(field.label)}
                <input type={field.mask === 'phone' ? 'tel' : field.type ?? 'text'} className={inputClass} disabled={!canEdit} placeholder={field.mask === 'phone' ? '+55 (11) 91234-5678' : field.placeholder} inputMode={field.mask === 'phone' ? 'tel' : field.mask && field.mask !== 'uf' ? 'numeric' : undefined}
                  value={form[field.key] ?? ''} onChange={(e) => change(field, e.target.value)} />
                {hint[field.key] && <span className="mt-1 block text-[11px] font-medium text-purple-700" role="status">{hint[field.key]}</span>}
              </label>
            ))}
          </div>
        </section>
      ))}

      {canEdit && (
        <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg px-4 py-3 shadow-lg">
          <span className="text-sm text-fg-sub">{dirty ? t('Há alterações não salvas.') : t('Tudo salvo.')}</span>
          <Button onClick={save} isLoading={saving} disabled={!dirty || Boolean(logoError)}>{t('Salvar alterações')}</Button>
        </div>
      )}
    </div>
  );
}
