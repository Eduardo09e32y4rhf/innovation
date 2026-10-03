import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Drawer } from '@/app/components/ui';
import { ROLE_LABEL } from '@/app/lib/format';
import { PERMISSIONS_LABELS, getDefaultPermissions } from '@/app/lib/permissions';
import type { AppUser, UserRole } from '@/app/lib/api';
import { userAccessPolicy } from './access-policy';
import { AccessConfirmDialog } from './access-confirm-dialog';
import { useAccessOverlay } from './use-access-overlay';

export type UserDrawerTab = 'geral' | 'permissoes' | 'seguranca' | 'vinculo';
interface UserDrawerProps {
  user: AppUser | null; isOpen: boolean; onClose: () => void;
  availableRoles: UserRole[]; currentRole?: string; currentUserId?: string; contextCompanyId?: string; isDevOwner?: boolean;
  initialTab?: UserDrawerTab;
  onSaveGeneral: (data: Partial<AppUser>) => Promise<void>;
  onSavePermissions: (customPermissions: string[] | null) => Promise<void>;
  onResetPassword: () => void; onToggleBlock: () => void;
}
const tabs = [
  { id: 'geral', label: 'Geral' }, { id: 'permissoes', label: 'Permissões' },
  { id: 'seguranca', label: 'Segurança' }, { id: 'vinculo', label: 'Vínculo' },
] as const;
const groups = [
  { prefix: 'time_tracking.', label: 'Ponto e jornada' }, { prefix: 'vacations.', label: 'Férias' },
  { prefix: 'settings.', label: 'Segurança' }, { prefix: 'users.', label: 'Funcionários' },
  { prefix: 'admin.', label: 'Administração' }, { prefix: 'platform.', label: 'Plataforma' },
];
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('pt-BR') : 'Não informado';

export function UserDrawer({ user, isOpen, onClose, availableRoles, currentRole, currentUserId, contextCompanyId, initialTab = 'geral',
  onSaveGeneral, onSavePermissions, onResetPassword, onToggleBlock }: UserDrawerProps) {
  const params = useParams();
  const tenant = String(params?.tenant || '');
  const [activeTab, setActiveTab] = useState<UserDrawerTab>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('FUNCIONARIO');
  const [isCustom, setIsCustom] = useState(false);
  const [custom, setCustom] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [restore, setRestore] = useState(false);
  useEffect(() => {
    if (!isOpen || !user) return;
    setActiveTab(initialTab); setName(user.name ?? ''); setEmail(user.email ?? ''); setRole(user.role);
    setIsCustom(!!user.customPermissions?.length);
    setCustom(user.customPermissions ?? getDefaultPermissions(user.role));
    setFeedback(null); setPendingAction(null); setRestore(false);
    // Updating one section must not discard the draft in the other section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.id, initialTab]);
  const policy = user ? userAccessPolicy(currentRole, currentUserId, user) : null;
  const original = user?.customPermissions?.length ? user.customPermissions : getDefaultPermissions(user?.role ?? '');
  const effectiveDraft = isCustom ? custom : getDefaultPermissions(user?.role ?? '');
  const generalDirty = !!user && (name !== user.name || email !== user.email || role !== user.role);
  const permissionsDirty = !!user && (isCustom !== !!user.customPermissions?.length ||
    (isCustom && (custom.length !== original.length || custom.some(key => !original.includes(key)))));
  function proceed(action: () => void) {
    if (busy.current) return;
    if (generalDirty || permissionsDirty) setPendingAction(() => action);
    else action();
  }
  const ref = useAccessOverlay(isOpen && !pendingAction && !restore, () => proceed(onClose), 'Detalhes do usuário');
  async function save(kind: 'general' | 'permissions', event?: React.FormEvent) {
    event?.preventDefault();
    if (busy.current || !user || !policy || (kind === 'general' ? !policy.edit : !policy.permissions)) return;
    busy.current = true; setSaving(true); setFeedback(null);
    try {
      if (kind === 'general') {
        await onSaveGeneral({ name: name.trim(), email: email.trim(), ...(role !== user.role && !policy.own ? { role } : {}) });
        setName(name.trim()); setEmail(email.trim());
      } else await onSavePermissions(isCustom ? custom : null);
      setFeedback({ success: true, message: kind === 'general' ? 'Dados do usuário salvos.' : 'Permissões salvas. Serão aplicadas conforme as regras de acesso do servidor.' });
    } catch (err) { setFeedback({ success: false, message: err instanceof Error ? err.message : 'Não foi possível salvar.' }); }
    finally { busy.current = false; setSaving(false); }
  }
  const fieldClass = 'input-v2 min-h-11 text-base sm:text-sm';
  return <>
    <div ref={ref}><Drawer isOpen={isOpen && !!user && !pendingAction && !restore} onClose={() => proceed(onClose)}
      title="Detalhes do usuário" description={user ? `${user.name} · ${user.email}` : ''} maxWidth="max-w-2xl"
      footer={<div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-mut" role="status">{generalDirty || permissionsDirty ? 'Há alterações não salvas.' : 'Dados atualizados.'}</p>
        <Button type="button" variant="outline" disabled={saving} onClick={() => proceed(onClose)}>Fechar</Button>
      </div>}>
      {user && policy && <div className="space-y-5">
        <label className="block space-y-2 text-sm font-medium sm:hidden"><span>Seção do usuário</span>
          <select value={activeTab} onChange={event => { setActiveTab(event.target.value as UserDrawerTab); setFeedback(null); }} className={fieldClass}>
            {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
          </select>
        </label>
        <nav aria-label="Seções do usuário" className="hidden flex-wrap gap-2 sm:flex">
          {tabs.map(tab => <Button key={tab.id} type="button" variant={activeTab === tab.id ? 'primary' : 'outline'}
            aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => { setActiveTab(tab.id); setFeedback(null); }}>{tab.label}</Button>)}
        </nav>
        {feedback && <p role={feedback.success ? 'status' : 'alert'} className={`rounded-xl p-3 text-sm ${feedback.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{feedback.message}</p>}
        {activeTab === 'geral' && <form onSubmit={event => save('general', event)} className="space-y-4">
          {!policy.edit && <p className="text-sm text-fg-mut">Você pode consultar estes dados. A edição deste perfil é restrita.</p>}
          <fieldset disabled={!policy.edit || saving} className="space-y-4">
            <label className="block space-y-2 text-sm font-medium"><span>Nome completo *</span><input required value={name} onChange={event => setName(event.target.value)} className={fieldClass} /></label>
            <label className="block space-y-2 text-sm font-medium"><span>E-mail *</span><input required type="email" value={email} onChange={event => setEmail(event.target.value)} className={fieldClass} /></label>
            <label className="block space-y-2 text-sm font-medium"><span>Perfil de acesso</span>
              <select value={role} disabled={policy.own} onChange={event => setRole(event.target.value as UserRole)} className={fieldClass}>
                {!availableRoles.includes(role) && <option value={role}>{ROLE_LABEL[role] ?? role}</option>}
                {availableRoles.map(value => <option key={value} value={value}>{ROLE_LABEL[value] ?? value}</option>)}
              </select>
            </label>
            {policy.own && <p className="text-sm text-fg-mut">A mudança de seu próprio perfil deve ser feita por outro administrador autorizado.</p>}
          </fieldset>
          <dl className="grid gap-4 rounded-xl border border-border bg-bg-sub p-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2"><dt className="text-fg-mut">Empresa</dt><dd className="break-words font-medium">{user.company?.name ?? 'Empresa atual'}</dd></div>
            <div><dt className="text-fg-mut">Último acesso</dt><dd>{user.lastActiveAt ? dateTime(user.lastActiveAt) : 'Nunca acessou'}</dd></div>
            <div><dt className="text-fg-mut">Criado em</dt><dd>{dateTime(user.createdAt)}</dd></div>
          </dl>
          {policy.edit && <Button type="submit" isLoading={saving} disabled={!generalDirty || !name.trim()}>Salvar alterações</Button>}
        </form>}
        {activeTab === 'permissoes' && <div className="space-y-4">
          <h3 className="text-base font-semibold">Permissões de {ROLE_LABEL[user.role] ?? user.role}</h3>
          <p className="text-sm text-fg-mut">Permissões personalizadas substituem o padrão do perfil. Restrições de perfil, empresa e módulos continuam valendo em cada endpoint.</p>
          <fieldset disabled={!policy.permissions || saving}>
            <legend className="sr-only">Modo de permissões</legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex min-h-11 items-center gap-2"><input type="radio" name="permission-mode" checked={!isCustom} onChange={() => setIsCustom(false)} />Padrão do perfil</label>
              <label className="flex min-h-11 items-center gap-2"><input type="radio" name="permission-mode" checked={isCustom} onChange={() => { setCustom(effectiveDraft); setIsCustom(true); }} />Personalizar</label>
            </div>
          </fieldset>
          {groups.map(group => <fieldset key={group.prefix} disabled={!policy.permissions || !isCustom || saving} className="rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold">{group.label}</legend>
            <div className="grid gap-2 sm:grid-cols-2">{Object.entries(PERMISSIONS_LABELS).filter(([key]) => key.startsWith(group.prefix)).map(([key, label]) =>
              <label key={key} className="flex min-h-11 items-start gap-3 py-2 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={effectiveDraft.includes(key)}
                  onChange={() => setCustom(current => current.includes(key) ? current.filter(value => value !== key) : [...current, key])} />
                <span>{label}</span>
              </label>)}</div>
          </fieldset>)}
          {custom.filter(key => !(key in PERMISSIONS_LABELS)).length > 0 && <p className="text-sm text-fg-mut">Permissões adicionais já salvas serão preservadas: {custom.filter(key => !(key in PERMISSIONS_LABELS)).join(', ')}.</p>}
          {isCustom && !custom.length && <p role="status" className="text-sm text-amber-800">Selecione ao menos uma permissão ou use o padrão. Uma lista vazia é interpretada como padrão pelo sistema.</p>}
          {!policy.permissions && <p className="text-sm text-fg-mut">{policy.own ? 'Outro administrador autorizado deve alterar suas permissões.' : 'A edição de permissões deste perfil é restrita.'}</p>}
          {policy.permissions && <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" disabled={saving || !isCustom} onClick={() => setRestore(true)}>Restaurar padrão</Button>
            <Button type="button" isLoading={saving} disabled={!permissionsDirty || (isCustom && !custom.length)} onClick={() => save('permissions')}>Salvar permissões</Button>
          </div>}
        </div>}
        {activeTab === 'seguranca' && <div className="space-y-4">
          <h3 className="text-base font-semibold">Segurança e histórico de acesso</h3>
          <dl className="grid gap-4 rounded-xl border border-border bg-bg-sub p-4 text-sm sm:grid-cols-2">
            {[
              ['Situação da conta', user.isActive === false ? 'Bloqueada' : 'Ativa'],
              ['Último acesso', user.lastActiveAt ? dateTime(user.lastActiveAt) : 'Nunca acessou'],
              ['Tentativas inválidas', String(user.failedLoginAttempts ?? 'Não informado')],
              ['Última troca de senha', dateTime(user.passwordChangedAt)],
              ['Troca pendente', user.forcePasswordChange ? 'Obrigatória no próximo login' : 'Não'],
              ['Criação do acesso', dateTime(user.createdAt)],
            ].map(([label, value]) => <div key={label}><dt className="text-fg-mut">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}
          </dl>
          <p className="text-sm text-fg-mut">O reset invalida sessões anteriores à troca de senha. O bloqueio impede o acesso às rotas autenticadas. Esta seção mostra os dados de acesso disponíveis, sem uma trilha completa de eventos.</p>
          <div className="flex flex-wrap gap-3">
            {policy.reset && <Button type="button" variant="outline" onClick={() => proceed(onResetPassword)}>Redefinir senha temporária</Button>}
            {policy.block && <Button type="button" variant={user.isActive === false ? 'outline' : 'danger'} onClick={() => proceed(onToggleBlock)}>{user.isActive === false ? 'Desbloquear acesso' : 'Bloquear acesso'}</Button>}
          </div>
          {policy.own && <Link className="btn btn-outline" href={`/${tenant}/dashboard/settings?section=seguranca`} onClick={event => { if (generalDirty || permissionsDirty) { event.preventDefault(); setFeedback({ success: false, message: 'Salve ou descarte as alterações antes de sair.' }); } }}>Alterar minha senha</Link>}
          {!policy.reset && !policy.own && <p className="text-sm text-fg-mut">Seu perfil não pode redefinir a senha desta conta.</p>}
        </div>}
        {activeTab === 'vinculo' && <div className="space-y-4">
          <h3 className="text-base font-semibold">Vínculo com funcionário</h3>
          {user.employee ? <>
            <dl className="grid gap-4 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
              {[
                ['Nome', user.employee.name], ['Matrícula', user.employee.registration || 'Não informada'],
                ['Cargo', user.employee.position || 'Não informado'], ['Departamento', user.employee.department || 'Não informado'],
                ['Situação', ({ ACTIVE: 'Ativo', INACTIVE: 'Inativo', TERMINATED: 'Desligado', ONBOARDING: 'Em admissão', SUSPENDED: 'Suspenso' } as Record<string, string>)[user.employee.status ?? ''] ?? user.employee.status ?? 'Não informada'],
              ].map(([label, value]) => <div key={label}><dt className="text-fg-mut">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}
            </dl>
            {['DEV', 'ADMIN', 'RH'].includes(currentRole ?? '') && (currentRole !== 'DEV' || user.companyId === contextCompanyId) && <Link className="btn btn-outline"
              href={`/${tenant}/dashboard/employees/new?id=${encodeURIComponent(user.employee.id)}`}
              onClick={event => { if (generalDirty || permissionsDirty) { event.preventDefault(); setFeedback({ success: false, message: 'Salve ou descarte as alterações antes de abrir o funcionário.' }); } }}>
              Abrir cadastro do funcionário
            </Link>}
            <p className="text-sm text-fg-mut">A associação é gerenciada no cadastro do funcionário, conforme a autorização desse módulo.</p>
            {currentRole === 'DEV' && user.companyId !== contextCompanyId && <p className="text-sm text-amber-800">Este funcionário pertence a outra empresa. Abra o contexto dessa empresa na Plataforma antes de editar o cadastro.</p>}
          </> : <>
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-fg-mut">Este usuário não está vinculado a um funcionário. O vínculo não será criado ao navegar para o cadastro.</p>
            <Link href={`/${tenant}/dashboard/employees`} className="btn btn-outline"
              onClick={event => { if (generalDirty || permissionsDirty) { event.preventDefault(); setFeedback({ success: false, message: 'Salve ou descarte as alterações antes de sair.' }); } }}>Ir para Funcionários</Link>
          </>}
        </div>}
      </div>}
    </Drawer></div>
    <AccessConfirmDialog isOpen={!!pendingAction} onClose={() => setPendingAction(null)} onConfirm={() => { const action = pendingAction; setPendingAction(null); action?.(); }}
      title="Descartar alterações do usuário?" description="As alterações não salvas em Geral e Permissões serão descartadas." confirmText="Descartar e continuar" />
    <AccessConfirmDialog isOpen={restore} onClose={() => setRestore(false)} onConfirm={() => { setIsCustom(false); setRestore(false); }}
      title="Restaurar permissões do perfil?" description="O padrão será aplicado ao rascunho. Clique em Salvar permissões para persistir a alteração." confirmText="Restaurar rascunho" variant="primary" />
  </>;
}
