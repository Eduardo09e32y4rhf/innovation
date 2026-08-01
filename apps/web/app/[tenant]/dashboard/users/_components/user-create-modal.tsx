import { useMemo, useState } from 'react';
import { X, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { ROLE_LABEL } from '@/app/lib/format';
import type { PlatformCompany, UserRole } from '@/app/lib/api';

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableRoles: UserRole[];
  currentRole?: string;
  companies: PlatformCompany[];
  onSubmit: (data: any) => Promise<void>;
}

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 10,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label = score <= 2 ? 'Fraca' : score <= 3 ? 'Média' : score === 4 ? 'Boa' : 'Forte';
  const color = score <= 2 ? 'bg-rose-500' : score <= 3 ? 'bg-amber-500' : score === 4 ? 'bg-blue-500' : 'bg-emerald-500';
  const width = `${(score / 5) * 100}%`;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width }} />
      </div>
      <p className={`text-[10px] font-bold ${score <= 2 ? 'text-rose-600' : score <= 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
        Força: {label}
      </p>
    </div>
  );
}

export function UserCreateModal({
  isOpen,
  onClose,
  availableRoles,
  currentRole,
  companies,
  onSubmit,
}: UserCreateModalProps) {
  const [companyId, setCompanyId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [role, setRole] = useState<UserRole>('FUNCIONARIO');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [createdName, setCreatedName] = useState('');

  const shouldShowCompanySelect = currentRole === 'DEV' && companies.length > 1;
  const defaultCompanyId = currentRole === 'DEV' && companies.length === 1 ? companies[0]?.id ?? '' : '';

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === (shouldShowCompanySelect ? companyId : defaultCompanyId)) ?? null,
    [companies, defaultCompanyId, shouldShowCompanySelect, companyId],
  );

  if (!isOpen) return null;

  const resetForm = () => {
    setCompanyId('');
    setName('');
    setEmail('');
    setEmailError('');
    setRole('FUNCIONARIO');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setDone(false);
    setCreatedName('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    if (shouldShowCompanySelect && !companyId) {
      setError('Por favor, selecione a empresa.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas nao coincidem.');
      return;
    }
    if (password.length < 10) {
      setError('A senha deve ter no minimo 10 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('A senha deve ter pelo menos uma letra maiuscula.');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('A senha deve ter pelo menos uma letra minuscula.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('A senha deve ter pelo menos um numero.');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setError('A senha deve ter pelo menos um caractere especial.');
      return;
    }

    setLoading(true);
    try {
      const resolvedCompanyId = shouldShowCompanySelect ? companyId : defaultCompanyId;
      await onSubmit({ companyId: resolvedCompanyId, name, email, role, password });
      setCreatedName(name);
      setDone(true);
    } catch (err: any) {
      const msg: string = err.message || 'Erro ao criar usuário';
      // Erro de e-mail duplicado → inline no campo
      if (/e-mail|email|cadastrado|duplicado/i.test(msg)) {
        setEmailError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Tela de sucesso ── */
  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[2px]">
        <div className="w-full max-w-md overflow-hidden rounded-[16px] bg-white shadow-2xl">
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h3 className="text-lg font-black text-slate-950">Usuário criado com sucesso!</h3>
            <p className="mt-2 text-sm text-slate-600">
              <strong>{createdName}</strong> foi cadastrado e receberá as credenciais de acesso.
            </p>
            <div className="mx-auto mt-4 max-w-xs rounded-[10px] border border-amber-200 bg-amber-50 p-3 text-left">
              <p className="flex items-start gap-2 text-xs font-semibold text-amber-800">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                A senha temporária foi definida. O usuário será obrigado a trocá-la no primeiro login.
              </p>
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={handleClose} className="btn-outline px-6">
                Fechar
              </button>
              <button
                onClick={() => {
                  resetForm();
                }}
                className="crystal-button px-6"
              >
                Criar outro
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Formulário ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md overflow-hidden rounded-[14px] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Novo usuario</h3>
            <p className="text-xs text-slate-500">Cadastre um novo acesso para sua equipe</p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="space-y-4">
            <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-600">Resumo do novo acesso</p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedCompany ? `Empresa: ${selectedCompany.name}. ` : 'Empresa sera definida no envio. '}
                O acesso sera criado com senha temporaria e obrigara troca no primeiro login.
              </p>
            </div>

            {shouldShowCompanySelect && (
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Empresa (Obrigatorio)</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="form-control"
                  required
                >
                  <option value="">Selecione a empresa...</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!shouldShowCompanySelect && defaultCompanyId && (
              <input type="hidden" value={defaultCompanyId} readOnly />
            )}

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Nome completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="form-control"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                required
                className={`form-control transition-colors ${emailError ? 'border-rose-400 ring-2 ring-rose-200 focus:border-rose-500' : ''}`}
              />
              {emailError && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                  <AlertCircle size={11} />
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Perfil de acesso</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="form-control"
              >
                {availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r] ?? r}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-[11px] font-bold text-slate-700">Forma de acesso</p>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input type="radio" checked readOnly className="accent-teal-600" />
                Criar com senha temporaria (troca obrigatoria)
              </label>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="password"
                    placeholder="Senha temporaria"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="form-control"
                  />
                  {password && <PasswordStrengthBar password={password} />}
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Confirmar senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="form-control"
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="mt-1 text-[10px] font-bold text-rose-600">Senhas não coincidem</p>
                  )}
                  {confirmPassword && confirmPassword === password && password.length >= 10 && (
                    <p className="mt-1 text-[10px] font-bold text-emerald-600">✓ Senhas coincidem</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck size={14} className="text-teal-600" />
                O usuario sera obrigado a trocar a senha no primeiro acesso.
              </div>
            </div>

            {error && (
              <p className="rounded-[8px] border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn-outline px-6"
            >
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="crystal-button px-6">
              {loading ? 'Criando...' : 'Criar usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
