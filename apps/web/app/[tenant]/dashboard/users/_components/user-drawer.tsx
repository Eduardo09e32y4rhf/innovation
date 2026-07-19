import { useState } from 'react';
import { X, Shield, KeyRound, Link as LinkIcon, User } from 'lucide-react';
import { ROLE_LABEL } from '@/app/lib/format';
import { PERMISSIONS_LABELS, getDefaultPermissions } from '@/app/lib/permissions';
import type { AppUser, UserRole } from '@/app/lib/api';

interface UserDrawerProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
  availableRoles: UserRole[];
  currentRole?: string;
  isDevOwner?: boolean;
  onSaveGeneral: (data: Partial<AppUser>) => Promise<void>;
  onSavePermissions: (customPermissions: string[] | null) => Promise<void>;
  onResetPassword: () => void;
  onToggleBlock: () => void;
  // TODO: Vínculo actions
}

type TabType = 'geral' | 'permissoes' | 'seguranca' | 'vinculo';

export function UserDrawer({
  user,
  isOpen,
  onClose,
  availableRoles,
  currentRole,
  isDevOwner,
  onSaveGeneral,
  onSavePermissions,
  onResetPassword,
  onToggleBlock,
}: UserDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [isSaving, setIsSaving] = useState(false);

  // States for Geral
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'FUNCIONARIO');

  // States for Permissões
  const [isCustomPerms, setIsCustomPerms] = useState(!!user?.customPermissions?.length);
  const [customPerms, setCustomPerms] = useState<string[]>(
    user?.customPermissions ?? getDefaultPermissions(user?.role ?? 'FUNCIONARIO')
  );

  if (!isOpen || !user) return null;

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    await onSaveGeneral({ name, email, role }).catch(() => {});
    setIsSaving(false);
  };

  const handleSavePerms = async () => {
    setIsSaving(true);
    await onSavePermissions(isCustomPerms ? customPerms : null).catch(() => {});
    setIsSaving(false);
  };

  const togglePermission = (key: string) => {
    if (!isCustomPerms) return;
    setCustomPerms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const tabs = [
    { id: 'geral', label: 'Geral', icon: User },
    { id: 'permissoes', label: 'Permissões', icon: Shield },
    { id: 'seguranca', label: 'Segurança', icon: KeyRound },
    { id: 'vinculo', label: 'Vínculo', icon: LinkIcon },
  ] as const;

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-slate-950/30" onClick={onClose} />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">Detalhes do usuário</h3>
              <p className="text-xs font-medium text-slate-500">{user.name}</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-6 flex gap-6 border-b border-slate-100">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 border-b-2 pb-3 text-xs font-bold transition-colors ${
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 p-6">
          {activeTab === 'geral' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Nome completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-control"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Perfil</label>
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

              {currentRole === 'DEV' && (
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Empresa</label>
                  <input type="text" value={user.company?.name ?? '-'} disabled className="form-control bg-slate-50" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Último acesso</label>
                  <input
                    type="text"
                    value={user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString('pt-BR') : 'Nunca acessou'}
                    disabled
                    className="form-control bg-slate-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Criado em</label>
                  <input
                    type="text"
                    value={user.createdAt ? new Date(user.createdAt).toLocaleString('pt-BR') : '-'}
                    disabled
                    className="form-control bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveGeneral}
                  disabled={isSaving}
                  className="crystal-button w-full"
                >
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'permissoes' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Permissões do perfil {ROLE_LABEL[user.role] ?? user.role}
                  </p>
                  <p className="text-xs text-slate-500">
                    Ao personalizar, as permissões padrão deixam de ser aplicadas.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-xs font-bold">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={!isCustomPerms}
                      onChange={() => {
                        setIsCustomPerms(false);
                        setCustomPerms(getDefaultPermissions(user.role));
                      }}
                      className="accent-teal-600"
                    />
                    Padrão
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={isCustomPerms}
                      onChange={() => setIsCustomPerms(true)}
                      className="accent-teal-600"
                    />
                    Personalizar
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(PERMISSIONS_LABELS).map(([key, label]) => (
                  <label
                    key={key}
                    className={`flex items-start gap-3 rounded-[8px] border p-3 transition-colors ${
                      isCustomPerms
                        ? 'cursor-pointer border-slate-200 hover:border-teal-200'
                        : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={customPerms.includes(key)}
                      onChange={() => togglePermission(key)}
                      disabled={!isCustomPerms}
                      className="mt-0.5 accent-teal-600"
                    />
                    <span className="text-xs font-medium text-slate-700">{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4">
                {isCustomPerms && (
                  <button
                    onClick={() => {
                      setIsCustomPerms(false);
                      setCustomPerms(getDefaultPermissions(user.role));
                    }}
                    className="text-xs font-bold text-teal-600 hover:underline"
                  >
                    Restaurar padrão do perfil
                  </button>
                )}
                <button
                  onClick={handleSavePerms}
                  disabled={isSaving}
                  className="crystal-button ml-auto px-6"
                >
                  {isSaving ? 'Salvando...' : 'Salvar permissões'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'seguranca' && (
            <div className="space-y-6">
              <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-2 gap-y-4 text-xs">
                  <div>
                    <p className="font-medium text-slate-500">Status da conta</p>
                    <p className="font-bold text-slate-900">
                      {user.isActive === false ? 'Bloqueada' : 'Ativa'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-500">Último acesso</p>
                    <p className="font-bold text-slate-900">
                      {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString('pt-BR') : 'Nunca'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-500">Tentativas inválidas</p>
                    <p className="font-bold text-rose-600">{user.failedLoginAttempts ?? 0}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-500">Última troca de senha</p>
                    <p className="font-bold text-slate-900">
                      {user.passwordChangedAt
                        ? new Date(user.passwordChangedAt).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-500">Troca pendente</p>
                    <p className="font-bold text-amber-600">
                      {user.forcePasswordChange ? 'Sim (obrigatória no login)' : 'Não'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={onResetPassword}
                  className="btn-outline flex items-center justify-center gap-2"
                >
                  <KeyRound size={14} /> Redefinir senha com senha temporária
                </button>
                <button
                  onClick={onToggleBlock}
                  className={`btn-outline flex items-center justify-center gap-2 ${
                    user.isActive === false ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {user.isActive === false ? 'Desbloquear acesso da conta' : 'Bloquear acesso da conta'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'vinculo' && (
            <div className="space-y-6">
              {user.employee ? (
                <div className="rounded-[12px] border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 font-black text-teal-700">
                      {user.employee.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{user.employee.name}</p>
                      <p className="text-xs font-medium text-slate-500">
                        {user.employee.registration ? `Matrícula ${user.employee.registration}` : 'Sem matrícula'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-medium text-slate-500">Cargo</p>
                      <p className="font-bold text-slate-900">{user.employee.position || '-'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-500">Departamento</p>
                      <p className="font-bold text-slate-900">{user.employee.department || '-'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    Este usuário não está vinculado a um funcionário.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    O vínculo é necessário para acessar Ponto, Férias e Escala.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {user.employee ? (
                  <>
                    <button className="btn-outline flex items-center justify-center gap-2 text-teal-600">
                      Abrir cadastro do funcionário
                    </button>
                    <button className="btn-outline flex items-center justify-center gap-2 text-rose-600">
                      Remover vínculo
                    </button>
                  </>
                ) : (
                  <button className="crystal-button flex items-center justify-center gap-2">
                    Vincular a um funcionário
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
