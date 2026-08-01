import { useMemo, useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
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
  const [role, setRole] = useState<UserRole>('FUNCIONARIO');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const shouldShowCompanySelect = currentRole === 'DEV' && companies.length > 1;
  const defaultCompanyId = currentRole === 'DEV' && companies.length === 1 ? companies[0]?.id ?? '' : '';

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === (shouldShowCompanySelect ? companyId : defaultCompanyId)) ?? null,
    [companies, defaultCompanyId, shouldShowCompanySelect, companyId],
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      setCompanyId('');
      setName('');
      setEmail('');
      setRole('FUNCIONARIO');
      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[14px] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Novo usuario</h3>
            <p className="text-xs text-slate-500">Cadastre um novo acesso para sua equipe</p>
          </div>
          <button
            onClick={onClose}
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
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-control"
              />
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
              onClick={onClose}
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
