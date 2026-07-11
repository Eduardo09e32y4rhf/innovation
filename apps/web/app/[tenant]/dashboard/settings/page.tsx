'use client';

import { useEffect, useMemo, useState } from 'react';
import { Image, Key, Save, X, Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle, Shield, Lock, History, Eye, EyeOff, MapPin } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';

const SAFE_LOGO_URL = /^https:\/\/[^\s?#]+\.(png|jpe?g|webp)(\?[^\s#]*)?(#[^\s]*)?$/i;
const MAX_LOGO_URL_LENGTH = 2048;
const MIN_PASSWORD_LENGTH = 10;

export default function SettingsPage() {
  const { user, changePassword } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canEditCompany = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Configurações</p>
        <h2 className="text-2xl font-black text-slate-950">{canEditCompany ? 'Administração do sistema' : 'Minha conta'}</h2>
      </header>

      {/* Security & Password Section */}
      <PasswordChangeSection changePassword={changePassword} />
      
      {/* Company Settings */}
      {canEditCompany && (
        <>
          <CompanySettings />
          <ImportExportSection />
        </>
      )}
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
  const passwordStrength = newPassword.length >= MIN_PASSWORD_LENGTH && passwordErrors.length <= 2 ? 'Média' 
    : newPassword.length >= MIN_PASSWORD_LENGTH && passwordErrors.length === 0 ? 'Forte' : 'Fraca';

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

  const inputClass = 'h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10';

  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-gradient-to-br from-teal-500 to-cyan-600 shadow-md">
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

        <button type="button" onClick={handleSubmit} disabled={!valid || loading} className="crystal-button mt-5 inline-flex h-10 items-center gap-2 rounded-[10px] bg-gradient-to-r from-teal-500 to-cyan-600 px-5 text-xs font-black text-white shadow-lg shadow-teal-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:opacity-60">
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
  const [address, setAddress] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [theme, setTheme] = useState('light');
    const [latitude, setLatitude] = useState<number | ''>('');
    const [longitude, setLongitude] = useState<number | ''>('');
    const [radiusTolerance, setRadiusTolerance] = useState<number>(150);
  const [removeLogo, setRemoveLogo] = useState(false);

  useEffect(() => {
    if (company.data) {
      setName(company.data.name ?? '');
      setLegalName(company.data.legalName ?? '');
      setDocument(company.data.document ?? '');
      setLogoUrl(company.data.logoUrl ?? '');
      setPhone(company.data.phone ?? '');
      setEmail(company.data.email ?? '');
      setAddress(company.data.address ?? '');
      setPrimaryColor(company.data.primaryColor ?? '');
      setTheme(company.data.theme ?? 'light');
          setLatitude(company.data.latitude ?? '');
          setLongitude(company.data.longitude ?? '');
          setRadiusTolerance(company.data.radiusTolerance ?? 150);
      setRemoveLogo(false);
    }
  }, [company.data]);

  const logoError = useMemo(() => (removeLogo ? '' : validateLogoUrl(logoUrl)), [logoUrl, removeLogo]);
  const previewLogo = !removeLogo && !logoError && logoUrl.trim() ? logoUrl.trim() : '';

  const save = useMutation(
    () => api.companies.update({
      name: name.trim() || undefined,
      legalName: legalName.trim() || undefined,
      document: document.trim() || undefined,
      logoUrl: removeLogo ? null : logoUrl.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      primaryColor: primaryColor.trim() || undefined,
      theme: theme || undefined,
    }),
    { onSuccess: () => company.refetch() },
  );

  const inputClass = 'h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10';

  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-gradient-to-br from-teal-500 to-cyan-600 shadow-md">
            <Image size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950">Dados da empresa</h3>
            <p className="text-xs font-semibold text-slate-500">Informações cadastrais, logo e identidade visual</p>
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
                <Image size={36} className="text-slate-300" />
              )}
            </div>
            {company.data?.logoUrl && !removeLogo && (
              <button type="button" onClick={() => setRemoveLogo(true)} className="btn-outline-premium flex h-9 w-full items-center justify-center gap-2 rounded-[8px] px-3 text-xs font-black">
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
                <span>Endereço</span>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, cidade - UF" disabled={company.loading} className={inputClass} />
              </label>
              
              <div className="col-span-1 sm:col-span-2 grid grid-cols-1 gap-6 sm:grid-cols-3 rounded-[12px] border border-teal-100 bg-teal-50/30 p-4">
                <div className="sm:col-span-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Geolocalização da Empresa</h4>
                    <p className="text-xs text-slate-500">Usado para validar a localização dos funcionários ao bater ponto.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setLatitude(pos.coords.latitude);
                            setLongitude(pos.coords.longitude);
                          },
                          (err) => alert('Erro ao pegar localização: ' + err.message),
                          { enableHighAccuracy: true }
                        );
                      } else {
                        alert('Geolocalização não suportada no navegador.');
                      }
                    }}
                    className="flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-700"
                  >
                    <MapPin size={14} /> Pegar Atual
                  </button>
                </div>
                
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>Latitude</span>
                  <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value ? Number(e.target.value) : '')} className={inputClass} placeholder="-23.55052" disabled={company.loading} />
                </label>
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>Longitude</span>
                  <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value ? Number(e.target.value) : '')} className={inputClass} placeholder="-46.63330" disabled={company.loading} />
                </label>
                <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>Tolerância (metros)</span>
                  <input type="number" value={radiusTolerance} onChange={(e) => setRadiusTolerance(Number(e.target.value))} className={inputClass} disabled={company.loading} />
                </label>
              </div>
            <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span>Logo da Empresa (URL ou Upload)</span>
                <div className="relative overflow-hidden rounded bg-teal-50 px-3 py-1 text-[10px] font-bold text-teal-700 hover:bg-teal-100 cursor-pointer">
                  Fazer Upload
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    className="absolute inset-0 cursor-pointer opacity-0" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const img = new window.Image();
                        img.onload = () => {
                          const canvas = document.createElement('canvas');
                          let width = img.width;
                          let height = img.height;
                          const max = 300;
                          if (width > height && width > max) { height = Math.round(height * (max / width)); width = max; }
                          else if (height > max) { width = Math.round(width * (max / height)); height = max; }
                          canvas.width = width; canvas.height = height;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.drawImage(img, 0, 0, width, height);
                            const dataUrl = canvas.toDataURL('image/webp', 0.85);
                            setRemoveLogo(false);
                            setLogoUrl(dataUrl);
                          }
                        };
                        img.src = ev.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
              </div>
              <input value={removeLogo ? '' : logoUrl} onChange={(e) => { setRemoveLogo(false); setLogoUrl(e.target.value); }} placeholder="https://seudominio.com/logo.png ou faça o upload..." disabled={company.loading} className={inputClass} />
              <span className="block text-[10px] font-semibold text-slate-400">Insira um link HTTPS ou faça upload do seu computador/celular. (A imagem será otimizada).</span>
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Cor principal</span>
              <div className="flex gap-2">
                <input type="color" value={primaryColor || '#0d9488'} onChange={(e) => setPrimaryColor(e.target.value)} className="h-11 w-11 cursor-pointer rounded-[10px] border border-slate-200 p-1" />
                <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#0d9488" disabled={company.loading} className={inputClass} />
              </div>
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Tema</span>
              <select value={theme} onChange={(e) => setTheme(e.target.value)} disabled={company.loading} className={inputClass}>
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => !logoError && save.mutate().catch(() => {})}
                disabled={Boolean(logoError) || save.loading || company.loading}
                className="crystal-button inline-flex h-10 items-center gap-2 rounded-[10px] bg-gradient-to-r from-teal-500 to-cyan-600 px-5 text-xs font-black text-white shadow-lg shadow-teal-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:opacity-60"
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
      const text = await importFile.text();
      const result = parseCSV(text);
      
      if (result.errors.length > 0) {
        setImportStatus({ type: 'error', message: `Erro ao importar: ${result.errors.join(', ')}` });
        setImporting(false);
        return;
      }

      // Import employees one by one
      let imported = 0;
      let errors = 0;
      for (const row of result.rows) {
        try {
          await api.employees.create({
            name: row['Nome'] || row['name'] || '',
            cpf: row['CPF'] || row['cpf'] || '',
            email: row['Email'] || row['email'] || '',
            position: row['Cargo'] || row['position'] || '',
            department: row['Departamento'] || row['department'] || '',
            admissionDate: row['Admissão'] || row['admissionDate'] || new Date().toISOString(),
            registration: row['Matrícula'] || row['registration'] || undefined,
            phone: row['Telefone'] || row['phone'] || undefined,
          });
          imported++;
        } catch {
          errors++;
        }
      }

      employees.refetch();
      setImportStatus({ 
        type: 'success', 
        message: `${imported} funcionário(s) importado(s)${errors > 0 ? `, ${errors} erro(s)` : ''}!` 
      });
    } catch (err) {
      setImportStatus({ type: 'error', message: 'Erro ao processar o arquivo. Verifique o formato CSV.' });
    }
    setImporting(false);
    setImportFile(null);
  }

  const inputClass = 'h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10';

  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
            <Upload size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950">Importar / Exportar dados</h3>
            <p className="text-xs font-semibold text-slate-500">Exporte cadastros e pontos ou importe funcionários via CSV</p>
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
          <p className="text-xs font-black uppercase tracking-wider text-slate-600 mb-3">Importar funcionários</p>
          
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
              <span>Arquivo CSV</span>
              <input 
                type="file" 
                accept=".csv,.xls,.xlsx" 
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 file:mr-3 file:rounded-[6px] file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-teal-700 hover:file:bg-teal-100"
              />
              <span className="text-[10px] font-semibold text-slate-400">
                Colunas esperadas: Nome, CPF, Email, Departamento, Cargo, Admissão, Matrícula, Telefone
              </span>
            </label>
            <button 
              onClick={handleImport} 
              disabled={!importFile || importing}
              className="self-end inline-flex h-11 items-center gap-2 rounded-[10px] bg-gradient-to-r from-teal-500 to-cyan-600 px-5 text-xs font-black text-white shadow-lg shadow-teal-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:opacity-60"
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
      <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-gradient-to-br from-teal-500 to-cyan-600 shadow-md">
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

function parseCSV(text: string): { rows: Record<string, string>[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    errors.push('Arquivo deve conter cabeçalho e pelo menos 1 linha de dados');
    return { rows: [], errors };
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });
    if (row['Nome'] || row['name'] || row['CPF'] || row['cpf']) {
      rows.push(row);
    }
  }

  return { rows, errors };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(v => v.replace(/^"|"$/g, ''));
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