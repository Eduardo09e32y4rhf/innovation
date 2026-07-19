import { useState } from 'react';
import { X } from 'lucide-react';
import { ROLE_LABEL } from '@/app/lib/format';
import type { UserRole } from '@/app/lib/api';

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableRoles: UserRole[];
  currentRole?: string;
  uniqueCompanies: string[];
  onSubmit: (data: any) => Promise<void>;
}

export function UserCreateModal({
  isOpen,
  onClose,
  availableRoles,
  currentRole,
  uniqueCompanies,
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (currentRole === 'DEV' && !companyId) {
      setError('Por favor, selecione a empresa.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    // Validação básica de senha forte
    if (password.length < 10) {
      setError('A senha deve ter no mínimo 10 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('A senha deve ter pelo menos uma letra maiúscula.');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('A senha deve ter pelo menos uma letra minúscula.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('A senha deve ter pelo menos um número.');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setError('A senha deve ter pelo menos um caractere especial.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ companyId, name, email, role, password });
      setCompanyId('');
      setName('');
      setEmail('');
      setRole('FUNCIONARIO');
      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[14px] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Novo usuário</h3>
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
            {currentRole === 'DEV' && (
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Empresa (Obrigatório)</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="form-control"
                  required
                >
                  <option value="">Selecione a empresa...</option>
                  {uniqueCompanies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
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
                Criar com senha temporária (troca obrigatória)
              </label>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="password"
                    placeholder="Senha temporária"
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
              {loading ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
