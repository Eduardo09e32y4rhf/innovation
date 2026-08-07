'use client';

import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Key, Save, X, Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle, Shield, Lock, History, Eye, EyeOff, MapPin, Settings } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { EmployeePasswordResetSection } from './_components/employee-password-reset-section';
import { CompanyFinanceSection } from './_components/company-finance-section';
import { PlatformPlansSection } from './_components/platform-plans-section';
import { PageHeader } from '@/app/components/ui';

const SAFE_LOGO_URL = /^https:\/\/[^\s?#]+\.(png|jpe?g|webp)(\?[^\s#]*)?(#[^\s]*)?$/i;
const MAX_LOGO_URL_LENGTH = 2048;
const MIN_PASSWORD_LENGTH = 10;

export default function SettingsPage({ params }: { params: { tenant: string } }) {
  const { user, changePassword } = useAuth();
  const tenant = params.tenant;
  const profile = user?.profile?.toUpperCase();

  const isEmployee =
    profile === 'FUNCIONARIO' ||
    profile === 'GESTOR' ||
    profile === 'CONSULTA';

  const isRh = profile === 'RH';

  const isAdmin = profile === 'ADMIN';

  const isDev = profile === 'DEV';

  const canResetEmployees =
    isRh ||
    isAdmin ||
    isDev;

  const canManageCompanyFinance =
    isAdmin ||
    isDev;

  const canManagePlatformPlans =
    isDev;

  const canEditCompany = isAdmin || isRh || isDev;

  const pageTitle = isDev
    ? 'Configurações da plataforma'
    : isAdmin
      ? 'Configurações da empresa'
      : isRh
        ? 'Configurações do RH'
        : 'Minha conta';

  const tabs = [
    { id: 'geral', label: 'Segurança & Acesso', icon: Shield, show: true },
    { id: 'rh', label: 'Acessos de Funcionários', icon: Key, show: canResetEmployees },
    { id: 'financeiro', label: 'Financeiro e Faturamento', icon: AlertTriangle, show: canManageCompanyFinance },
    { id: 'planos', label: 'Planos e Limites', icon: FileSpreadsheet, show: canManagePlatformPlans },
    { id: 'empresa', label: 'Configurações da Empresa', icon: Settings, show: canEditCompany },
    { id: 'dados', label: 'Importação e Exportação', icon: Download, show: canEditCompany },
  ].filter(t => t.show);

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'geral');

  return (
    <div className="app-page">
      <div className="app-page-content">
        <PageHeader 
          title={pageTitle} 
          subtitle="Gerencie apenas as opções permitidas para o seu perfil."
        />

        <div className="flex flex-col gap-8 md:flex-row mt-6">
        {/* Sidebar Tabs */}
        <nav className="flex w-full overflow-x-auto no-scrollbar gap-2 pb-2 md:pb-0 md:flex-col md:gap-1 md:w-64 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-[var(--color-brand-700)] shadow-[var(--shadow-sm)] border border-[var(--color-brand-200)]'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {activeTab === 'geral' && <PasswordChangeSection changePassword={changePassword} />}
          {activeTab === 'rh' && canResetEmployees && <EmployeePasswordResetSection />}
          {activeTab === 'financeiro' && canManageCompanyFinance && <CompanyFinanceSection tenant={tenant} />}
          {activeTab === 'planos' && canManagePlatformPlans && <PlatformPlansSection tenant={tenant} />}
          {activeTab === 'empresa' && canEditCompany && <CompanySettings />}
          {activeTab === 'dados' && canEditCompany && <ImportExportSection />}
        </div>
      </div>
    </div>
    </div>
  );
}

// ─── PASSWORD CHANGE ─────────────────────────────────────────────────────────

function PasswordChangeSection({ changePassword }: { changePassword: (current: string, newPass: string) => Promise<void> }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const passwordErrors: string[] = [];
  if (newPassword && newPassword.length < MIN_PASSWORD_LENGTH) passwordErrors.push(`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`);
  if (newPassword && !/[A-Z]/.test(newPassword)) passwordErrors.push('Pelo menos 1 letra maiúscula');
  if (newPassword && !/[a-z]/.test(newPassword)) passwordErrors.push('Pelo menos 1 letra minúscula');
  if (newPassword && !/[0-9]/.test(newPassword)) passwordErrors.push('Pelo menos 1 número');
  if (newPassword && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) passwordErrors.push('Pelo menos 1 caractere especial');
  const passwordStrength = newPassword.length >= MIN_PASSWORD_LENGTH && passwordErrors.length === 0 ? 'Forte' 
    : newPassword.length >= MIN_PASSWORD_LENGTH && passwordErrors.length <= 2 ? 'Média' : 'Fraca';

  const strengthColors: Record<string, string> = {
    'Fraca': 'bg-rose-500 w-1/3',
    'Média': 'bg-amber-500 w-2/3',
    'Forte': 'bg-emerald-500 w-full',
  };

  const valid = currentPassword.length >= 1 && newPassword.length >= MIN_PASSWORD_LENGTH && newPassword === confirmPassword && passwordErrors.length === 0;

  async function handleSubmit() {
    if (!valid) return;
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao trocar a senha.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'form-control h-11 text-sm';

  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] shadow-[var(--shadow-sm)]">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950">Segurança da conta</h3>
            <p className="text-xs font-semibold text-slate-500">Política de senha forte e proteção de acesso</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {error && <p className="mb-4 rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">{error}</p>}
        {success && <p className="mb-4 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 flex items-center gap-2"><CheckCircle size={14} />Senha alterada com sucesso!</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Senha atual</span>
            <div className="relative">
              <input type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} />
              <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Nova senha</span>
            <div className="relative">
              <input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
            </div>
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className={`h-full rounded-full transition-all ${strengthColors[passwordStrength]}`} />
                </div>
                <p className={`text-[10px] font-bold ${passwordStrength === 'Forte' ? 'text-emerald-600' : passwordStrength === 'Média' ? 'text-amber-600' : 'text-rose-600'}`}>
                  Força: {passwordStrength}
                </p>
                {passwordErrors.map((err) => (
                  <p key={err} className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">
                    <AlertTriangle size={9} /> {err}
                  </p>
                ))}
              </div>
            )}
          </label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Confirmar nova senha</span>
            <div className="relative">
              <input type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-1 text-[10px] font-bold text-rose-600">As senhas não coincidem</p>
            )}
          </label>
        </div>

        <button type="button" onClick={handleSubmit} disabled={!valid || loading} className="btn btn-primary h-10 mt-5 w-fit px-5">
          <Lock size={14} strokeWidth={2.5} />
          {loading ? 'Salvando...' : 'Alterar senha'}
        </button>

        {/* Password Policy */}
        <div className="mt-5 rounded-[10px] border border-slate-200/60 bg-slate-50/50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2">Política de senha</p>
          <ul className="space-y-1 text-[11px] font-semibold text-slate-500">
            <li className="flex items-center gap-2"><Lock size={11} className="text-slate-400" /> Mínimo de {MIN_PASSWORD_LENGTH} caracteres</li>
            <li className="flex items-center gap-2"><Lock size={11} className="text-slate-400" /> Letras maiúsculas e minúsculas</li>
            <li className="flex items-center gap-2"><Lock size={11} className="text-slate-400" /> Pelo menos 1 número</li>
            <li className="flex items-center gap-2"><Lock size={11} className="text-slate-400" /> Pelo menos 1 caractere especial</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── COMPANY SETTINGS ────────────────────────────────────────────────────────

function CompanySettings() {
  const company = useQuery(() => api.companies.me(), []);
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [document, setDocument] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Endereço
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Inscrições
  const [stateRegistration, setStateRegistration] = useState('');
  const [municipalRegistration, setMunicipalRegistration] = useState('');

  // Representante
  const [legalRepresentativeName, setLegalRepresentativeName] = useState('');
  const [legalRepresentativeCpf, setLegalRepresentativeCpf] = useState('');
  const [legalRepresentativeRole, setLegalRepresentativeRole] = useState('');
  const [legalRepresentativeEmail, setLegalRepresentativeEmail] = useState('');
  const [legalRepresentativePhone, setLegalRepresentativePhone] = useState('');

  const [removeLogo, setRemoveLogo] = useState(false);

  useEffect(() => {
    if (company.data) {
      setName(company.data.name ?? '');
      setLegalName(company.data.legalName ?? '');
      setDocument(company.data.document ?? '');
      setLogoUrl(company.data.logoUrl ?? '');
      setPhone(company.data.phone ?? '');
      setEmail(company.data.email ?? '');

      setZipCode(company.data.zipCode ?? '');
      setStreet(company.data.street ?? '');
      setStreetNumber(company.data.streetNumber ?? '');
      setAddressComplement(company.data.addressComplement ?? '');
      setNeighborhood(company.data.neighborhood ?? '');
      setCity(company.data.city ?? '');
      setState(company.data.state ?? '');

      setStateRegistration(company.data.stateRegistration ?? '');
      setMunicipalRegistration(company.data.municipalRegistration ?? '');

      setLegalRepresentativeName(company.data.legalRepresentativeName ?? '');
      setLegalRepresentativeCpf(company.data.legalRepresentativeCpf ?? '');
      setLegalRepresentativeRole(company.data.legalRepresentativeRole ?? '');
      setLegalRepresentativeEmail(company.data.legalRepresentativeEmail ?? '');
      setLegalRepresentativePhone(company.data.legalRepresentativePhone ?? '');
      setRemoveLogo(false);
    }
  }, [company.data]);

  const logoError = useMemo(() => (removeLogo ? '' : validateLogoUrl(logoUrl)), [logoUrl, removeLogo]);
  const previewLogo = !removeLogo && !logoError && logoUrl.trim() ? logoUrl.trim() : '';

  // Dirty check — desabilita Salvar se nada mudou
  const hasChanges = useMemo(() => {
    if (!company.data) return false;
    const d = company.data;
    if (removeLogo !== false && d.logoUrl) return true; // logo foi marcado para remover
    return (
      name !== (d.name ?? '') ||
      legalName !== (d.legalName ?? '') ||
      document !== (d.document ?? '') ||
      (!removeLogo && logoUrl !== (d.logoUrl ?? '')) ||
      phone !== (d.phone ?? '') ||
      email !== (d.email ?? '') ||
      zipCode !== (d.zipCode ?? '') ||
      street !== (d.street ?? '') ||
      streetNumber !== (d.streetNumber ?? '') ||
      addressComplement !== (d.addressComplement ?? '') ||
      neighborhood !== (d.neighborhood ?? '') ||
      city !== (d.city ?? '') ||
      state !== (d.state ?? '') ||
      stateRegistration !== (d.stateRegistration ?? '') ||
      municipalRegistration !== (d.municipalRegistration ?? '') ||
      legalRepresentativeName !== (d.legalRepresentativeName ?? '') ||
      legalRepresentativeCpf !== (d.legalRepresentativeCpf ?? '') ||
      legalRepresentativeRole !== (d.legalRepresentativeRole ?? '') ||
      legalRepresentativeEmail !== (d.legalRepresentativeEmail ?? '') ||
      legalRepresentativePhone !== (d.legalRepresentativePhone ?? '')
    );
  }, [
    company.data, removeLogo, name, legalName, document, logoUrl,
    phone, email, zipCode, street, streetNumber, addressComplement,
    neighborhood, city, state, stateRegistration, municipalRegistration,
    legalRepresentativeName, legalRepresentativeCpf, legalRepresentativeRole,
    legalRepresentativeEmail, legalRepresentativePhone,
  ]);

  const save = useMutation(
    () => api.companies.update({
      name: name.trim() || undefined,
      legalName: legalName.trim() || undefined,
      document: document.trim() || undefined,
      logoUrl: removeLogo ? null : logoUrl.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      
      zipCode: zipCode.trim() || undefined,
      street: street.trim() || undefined,
      streetNumber: streetNumber.trim() || undefined,
      addressComplement: addressComplement.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,

      stateRegistration: stateRegistration.trim() || undefined,
      municipalRegistration: municipalRegistration.trim() || undefined,

      legalRepresentativeName: legalRepresentativeName.trim() || undefined,
      legalRepresentativeCpf: legalRepresentativeCpf.trim() || undefined,
      legalRepresentativeRole: legalRepresentativeRole.trim() || undefined,
      legalRepresentativeEmail: legalRepresentativeEmail.trim() || undefined,
      legalRepresentativePhone: legalRepresentativePhone.trim() || undefined,
    }),
    { onSuccess: () => company.refetch() },
  );

  const inputClass = 'form-control h-11 text-sm';

  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] shadow-[var(--shadow-sm)]">
            <ImageIcon size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950">Dados cadastrais e contratuais</h3>
            <p className="text-xs font-semibold text-slate-500">Informações jurídicas, contato, endereço e representante legal</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {company.error && <p className="mb-4 rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">{company.error}</p>}
        {save.error && <p className="mb-4 rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">{save.error}</p>}
        {logoError && <p className="mb-4 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">{logoError}</p>}

        <div className="grid gap-6 sm:grid-cols-[160px_1fr]">
          <div className="space-y-3">
            <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50">
              {previewLogo ? (
                <img src={previewLogo} alt="Logo da empresa" className="h-full w-full object-contain p-3" />
              ) : (
                <ImageIcon size={36} className="text-slate-300" />
              )}
            </div>
            {company.data?.logoUrl && !removeLogo && (
              <button type="button" onClick={() => setRemoveLogo(true)} className="btn btn-outline h-9 w-full px-3 text-xs flex gap-2 justify-center">
                <X size={13} /> Remover logo
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Nome fantasia</span>
              <input value={name} onChange={(e) => setName(e.target.value)} disabled={company.loading} className={inputClass} />
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Razão social</span>
              <input value={legalName} onChange={(e) => setLegalName(e.target.value)} disabled={company.loading} className={inputClass} />
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>CNPJ</span>
              <input value={document} onChange={(e) => setDocument(formatCnpj(e.target.value))} placeholder="00.000.000/0000-00" disabled={company.loading} className={inputClass} />
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Telefone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 90000-0000" disabled={company.loading} className={inputClass} />
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>E-mail da empresa</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" disabled={company.loading} className={inputClass} />
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Inscrição Estadual</span>
              <input value={stateRegistration} onChange={(e) => setStateRegistration(e.target.value)} disabled={company.loading} className={inputClass} />
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Inscrição Municipal</span>
              <input value={municipalRegistration} onChange={(e) => setMunicipalRegistration(e.target.value)} disabled={company.loading} className={inputClass} />
            </label>

            {/* Endereço */}
            <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-black text-slate-900 mb-4">Endereço Completo</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>CEP</span>
                  <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} disabled={company.loading} className={inputClass} />
                </label>
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600 sm:col-span-2">
                  <span>Logradouro</span>
                  <input value={street} onChange={(e) => setStreet(e.target.value)} disabled={company.loading} className={inputClass} />
                </label>
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>Número</span>
                  <input value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} disabled={company.loading} className={inputClass} />
                </label>
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>Complemento</span>
                  <input value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} disabled={company.loading} className={inputClass} />
                </label>
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>Bairro</span>
                  <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} disabled={company.loading} className={inputClass} />
                </label>
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>Cidade</span>
                  <input value={city} onChange={(e) => setCity(e.target.value)} disabled={company.loading} className={inputClass} />
                </label>
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>Estado (UF)</span>
                  <input value={state} onChange={(e) => setState(e.target.value)} disabled={company.loading} className={inputClass} />
                </label>
              </div>
            </div>

            {/* Representante Legal */}
            <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-sm font-black text-slate-900 mb-4">Representante Legal</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>Nome completo</span>
                  <input value={legalRepresentativeName} onChange={(e) => setLegalRepresentativeName(e.target.value)} disabled={company.loading} className={inputClass} />
                </label>
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>CPF</span>
                  <input value={legalRepresentativeCpf} onChange={(e) => setLegalRepresentativeCpf(e.target.value)} disabled={company.loading} className={inputClass} />
                </label>
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>Cargo / Função</span>
                  <input value={legalRepresentativeRole} onChange={(e) => setLegalRepresentativeRole(e.target.value)} disabled={company.loading} className={inputClass} />
                </label>
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>E-mail</span>
                  <input type="email" value={legalRepresentativeEmail} onChange={(e) => setLegalRepresentativeEmail(e.target.value)} disabled={company.loading} className={inputClass} />
                </label>
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>Telefone</span>
                  <input value={legalRepresentativePhone} onChange={(e) => setLegalRepresentativePhone(e.target.value)} disabled={company.loading} className={inputClass} />
                </label>
              </div>
            </div>

            <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600 sm:col-span-2 mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span>Logo da Empresa (URL ou Upload)</span>
                <div className="relative overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-brand-50)] px-3 py-1 text-[10px] font-bold text-[var(--color-brand-700)] hover:bg-[var(--color-brand-100)] cursor-pointer">
                  Fazer Upload
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                    className="absolute inset-0 cursor-pointer opacity-0" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const result = ev.target?.result as string;
                        setRemoveLogo(false);
                        setLogoUrl(result);
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
              <input value={removeLogo ? '' : logoUrl} onChange={(e) => { setRemoveLogo(false); setLogoUrl(e.target.value); }} placeholder="https://seudominio.com/logo.png ou faça o upload..." disabled={company.loading} className={inputClass} />
            </label>
            <div className="sm:col-span-2">
              {hasChanges && (
                <p className="mb-3 flex items-center gap-2 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  <Save size={11} />
                  Há alterações não salvas
                </p>
              )}
              <button
                type="button"
                onClick={() => !logoError && save.mutate().catch(() => {})}
                disabled={Boolean(logoError) || save.loading || company.loading || !hasChanges}
                className="btn btn-primary h-10 px-5 w-fit gap-2"
              >
                <Save size={14} strokeWidth={2.5} />
                {save.loading ? 'Salvando...' : 'Salvar configurações'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── IMPORT / EXPORT ─────────────────────────────────────────────────────────

function ImportExportSection() {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [importing, setImporting] = useState(false);

  const employees = useQuery(() => api.employees.list(), []);
  const timeTracks = useQuery(() => api.timeTrack.list(), []);
  const vacations = useQuery(() => api.vacations.list(), []);

  async function handleExport(type: 'employees' | 'time-track' | 'vacations' | 'users') {
    let data: unknown[] = [];
    let filename = '';
    let headers: string[] = [];

    switch (type) {
      case 'employees':
        data = employees.data ?? [];
        filename = 'funcionarios';
        headers = ['Nome', 'CPF', 'Email', 'Matrícula', 'Departamento', 'Cargo', 'Gestor', 'Status', 'Admissão', 'Telefone'];
        break;
      case 'time-track':
        data = timeTracks.data ?? [];
        filename = 'pontos';
        headers = ['Funcionário', 'Data', 'Entrada', 'Almoço Início', 'Almoço Fim', 'Saída', 'Trabalhado', 'Saldo'];
        break;
      case 'vacations':
        data = vacations.data ?? [];
        filename = 'ferias';
        headers = ['Funcionário', 'Início', 'Fim', 'Dias', 'Período Aquisitivo', 'Status'];
        break;
      case 'users':
        // Just export employee list as user reference
        data = employees.data ?? [];
        filename = 'usuarios';
        headers = ['Nome', 'Email', 'Perfil', 'Acesso'];
        break;
    }

    downloadCSV(data, headers, filename);
  }

  async function handleImport() {
    if (!importFile) return;
    setImportStatus(null);
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const result = await api.request<{ message: string; imported: number; errors: string[] }>('/employees/import', {
        method: 'POST',
        body: formData,
      });

      if (result.errors && result.errors.length > 0) {
        setImportStatus({ type: 'error', message: `Importação parcial/com erro. Verifique o console. ${result.imported} sucesso(s), ${result.errors.length} erro(s).` });
        console.error('Erros de importação:', result.errors);
      } else {
        setImportStatus({ type: 'success', message: result.message });
      }

      employees.refetch();
    } catch (err) {
      setImportStatus({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao processar o arquivo. Verifique o formato (.xlsx).' });
    }
    setImporting(false);
    setImportFile(null);
  }

  const inputClass = 'form-control h-11 text-sm';

  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] shadow-[var(--shadow-sm)]">
            <Upload size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950">Importar / Exportar dados</h3>
            <p className="text-xs font-semibold text-slate-500">Exporte dados do sistema ou importe novos funcionários</p>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-6">
        {/* Export */}
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-600 mb-3">Exportar dados</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ExportButton label="Funcionários" icon={Download} onClick={() => handleExport('employees')} />
            <ExportButton label="Pontos" icon={Download} onClick={() => handleExport('time-track')} />
            <ExportButton label="Férias" icon={Download} onClick={() => handleExport('vacations')} />
            <ExportButton label="Usuários" icon={Download} onClick={() => handleExport('users')} />
          </div>
        </div>

        {/* Import */}
        <div className="border-t border-slate-100 pt-6">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-600">Importar funcionários</p>
            <a 
              href={`${process.env.NEXT_PUBLIC_API_URL || '/api'}/employees/import/template`} 
              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              download
            >
              <FileSpreadsheet size={14} /> Baixar Modelo XLSX
            </a>
          </div>
          
          {importStatus && (
            <div className={`mb-4 rounded-[10px] px-4 py-2.5 text-xs font-semibold flex items-center gap-2 ${
              importStatus.type === 'success' 
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' 
                : 'border border-rose-200 bg-rose-50 text-rose-700'
            }`}>
              {importStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {importStatus.message}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Arquivo XLSX preenchido</span>
              <input 
                type="file" 
                accept=".xlsx" 
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="form-control h-11 file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[var(--color-brand-50)] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[var(--color-brand-700)] hover:file:bg-[var(--color-brand-100)]"
              />
            </label>
            <button 
              onClick={handleImport} 
              disabled={!importFile || importing}
              className="btn btn-primary h-11 px-5 gap-2 self-end"
            >
              {importing ? 'Importando...' : <><Upload size={14} strokeWidth={2.5} /> Importar</>}
            </button>
          </div>
        </div>

        {/* Security logs info */}
        <div className="border-t border-slate-100 pt-6">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600 mb-3">Auditoria e logs</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[10px] border border-slate-200/60 bg-slate-50/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <History size={14} className="text-teal-600" />
                <span className="text-xs font-bold text-slate-700">Histórico de ações</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">Todas as alterações em cadastros, pontos e férias são registradas automaticamente com data, usuário e ação realizada.</p>
            </div>
            <div className="rounded-[10px] border border-slate-200/60 bg-slate-50/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-teal-600" />
                <span className="text-xs font-bold text-slate-700">Proteção de acesso</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">Sessão expira após 24h de inatividade. Tentativas de login inválidas geram bloqueio temporário.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function ExportButton({ label, icon: Icon, onClick }: { label: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 rounded-[10px] border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-3.5 text-xs font-black text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md active:translate-y-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] shadow-[var(--shadow-sm)]">
        <Icon size={14} strokeWidth={2.5} className="text-white" />
      </div>
      {label}
    </button>
  );
}

function downloadCSV(data: unknown[], headers: string[], filename: string) {
  if (data.length === 0) {
    window.alert('Nenhum dado disponível para exportar.');
    return;
  }

  const rows = data.map((item: any) => {
    return headers.map(header => {
      const keyMap: Record<string, string> = {
        'Nome': 'name', 'CPF': 'cpf', 'Email': 'email', 'Matrícula': 'registration',
        'Departamento': 'department', 'Cargo': 'position', 'Gestor': 'managerId',
        'Status': 'status', 'Admissão': 'admissionDate', 'Telefone': 'phone',
        'Data': 'date', 'Entrada': 'entry', 'Almoço Início': 'lunchStart',
        'Almoço Fim': 'lunchReturn', 'Saída': 'exit', 'Trabalhado': 'totalWorked',
        'Saldo': 'dailyBalance', 'Início': 'startDate', 'Fim': 'endDate',
        'Dias': 'daysUsed', 'Período Aquisitivo': 'acquisitionPeriod',
        'Perfil': 'role', 'Acesso': 'isActive',
      };
      const key = keyMap[header] || header.toLowerCase();
      let value = item[key] !== undefined ? String(item[key]) : '';
      
      // Handle nested objects
      if (key === 'employee' && item.employee) {
        value = item.employee.name || '';
      }
      
      // Escape CSV
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  }).join('\n');

  const csv = '\uFEFF' + headers.join(',') + '\n' + rows;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}



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
  if (trimmed.startsWith('data:image/')) return ''; // Allow base64 images
  if (trimmed.length > MAX_LOGO_URL_LENGTH) return 'A URL da logo precisa ter no máximo 2048 caracteres.';
  if (/\.svg(\?|#|$)/i.test(trimmed)) return 'SVG está bloqueado por segurança. Use PNG, JPG ou WebP.';
  if (!SAFE_LOGO_URL.test(trimmed)) return 'Use uma URL HTTPS terminando em PNG, JPG, JPEG ou WebP, ou faça upload de um arquivo local.';
  return '';
}