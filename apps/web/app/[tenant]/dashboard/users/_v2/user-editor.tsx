'use client';

import { Ban, KeyRound, Link2, Search, ShieldCheck, Trash2, Unlink, UserCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, Drawer, Modal } from '@/app/components/ui';
import { api, type AppUser, type LinkableEmployee, type UserRole } from '@/app/lib/api';
import { PERMISSIONS_LABELS, getDefaultPermissions } from '@/app/lib/permissions';
import { ActivityPanel } from './activity-panel';
import { ROLE_INFO, STATUS_LABEL, STATUS_STYLE, accessStatus, canManage, dateTime, rolesFor } from './policy';

type Tab = 'dados' | 'atividade' | 'permissoes' | 'seguranca';
const TABS: { id: Tab; label: string }[] = [{ id: 'dados', label: 'Dados e visão' }, { id: 'atividade', label: 'Atividade' }, { id: 'permissoes', label: 'Permissões' }, { id: 'seguranca', label: 'Segurança' }];
const field = 'input-v2 min-h-11 w-full text-base sm:text-sm';
const errorText = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);

export function UserEditor({ user, isOpen, onClose, actorRole, actorId, onChanged }: {
  user: AppUser | null; isOpen: boolean; onClose: () => void; actorRole: string; actorId?: string; onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>('dados');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('FUNCIONARIO');
  const [custom, setCustom] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<'block' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);
  const busy = useRef(false);

  // vínculo
  const [linkSearch, setLinkSearch] = useState('');
  const [linkOptions, setLinkOptions] = useState<LinkableEmployee[]>([]);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  // senha provisória
  const [temp, setTemp] = useState<{ temporaryPassword: string; expiresAt: string } | null>(null);
  const [tempBusy, setTempBusy] = useState<'reveal' | 'reissue' | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    setTab('dados'); setName(user.name); setEmail(user.email); setRole(user.role); setCustom(user.customPermissions?.length ? user.customPermissions : null);
    setFeedback(null); setTemp(null); setLinkSearch(''); setConfirm(null); setReason('');
    // reabrir apenas quando muda o usuário
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (!isOpen || !user || tab !== 'dados' || user.employee) return;
    const timer = window.setTimeout(() => {
      api.users.linkableEmployees(linkSearch, actorRole === 'DEV' ? user.companyId : undefined).then((items) => { setLinkOptions(items); setLinkError(''); }).catch((cause) => { setLinkOptions([]); setLinkError(errorText(cause, 'Não foi possível buscar os funcionários.')); });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isOpen, user, tab, linkSearch, actorRole]);

  if (!user) return null;
  const status = accessStatus(user);
  const own = user.id === actorId;
  const manageable = canManage(actorRole, user.role) && !own;
  // Quem administra pode atrelar o próprio acesso a um funcionário (ex.: o dono que também é colaborador).
  const canLink = manageable || (own && ['DEV', 'CEO', 'ADMIN', 'RH'].includes(actorRole));
  const roleOptions = rolesFor(actorRole);
  const effectivePermissions = custom ?? getDefaultPermissions(user.role);
  const generalDirty = name.trim() !== user.name || email.trim().toLowerCase() !== user.email || role !== user.role;
  const original = user.customPermissions?.length ? user.customPermissions : null;
  const permsDirty = JSON.stringify([...(custom ?? [])].sort()) !== JSON.stringify([...(original ?? [])].sort());

  async function run(action: () => Promise<unknown>, success: string) {
    if (busy.current) return;
    busy.current = true; setSaving(true); setFeedback(null);
    try { await action(); setFeedback({ ok: true, text: success }); onChanged(); }
    catch (cause) { setFeedback({ ok: false, text: errorText(cause, 'Não foi possível concluir a ação.') }); }
    finally { busy.current = false; setSaving(false); }
  }

  const saveGeneral = () => run(() => api.users.update(user.id, { name: name.trim(), email: email.trim().toLowerCase(), ...(role !== user.role && !own ? { role } : {}) }), 'Dados salvos.');
  const savePermissions = () => run(() => api.users.update(user.id, { customPermissions: custom && custom.length ? custom : [] }), 'Permissões salvas.');
  const link = (employee: LinkableEmployee) => { setLinking(true); void run(() => api.users.linkEmployee(user.id, employee.id), `Atrelado a ${employee.name}.`).finally(() => setLinking(false)); };
  const unlink = () => run(() => api.users.linkEmployee(user.id, null), 'Vínculo removido. O usuário continua acessando conforme a visão.');

  async function confirmAction() {
    if (!confirm) return;
    setActing(true); setFeedback(null);
    try {
      if (confirm === 'block') await api.users.block(user!.id, reason.trim() || undefined);
      else await api.users.cancel(user!.id, reason.trim() || undefined);
      toast.success(confirm === 'block' ? 'Acesso bloqueado.' : 'Acesso cancelado.');
      setConfirm(null); setReason(''); onChanged();
    } catch (cause) { setFeedback({ ok: false, text: errorText(cause, 'Não foi possível concluir.') }); setConfirm(null); }
    finally { setActing(false); }
  }

  async function reactivate() {
    await run(() => api.users.unblock(user!.id), 'Acesso reativado.');
  }

  async function password(kind: 'reveal' | 'reissue') {
    setTempBusy(kind); setFeedback(null);
    try { setTemp(await (kind === 'reveal' ? api.users.revealTemporaryPassword(user!.id) : api.users.reissueTemporaryPassword(user!.id))); onChanged(); }
    catch (cause) { setFeedback({ ok: false, text: errorText(cause, 'Não foi possível obter a senha provisória.') }); }
    finally { setTempBusy(null); }
  }

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl" title={user.name} description={`${user.company?.name ?? 'Empresa'} · ${ROLE_INFO[user.role]?.label ?? user.role}`}
        footer={manageable ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
            <div className="flex flex-wrap gap-2">
              {status === 'ATIVO'
                ? <Button variant="outline" onClick={() => setConfirm('block')}><Ban size={15} aria-hidden="true" /> Bloquear</Button>
                : <Button variant="outline" isLoading={saving} onClick={reactivate}><UserCheck size={15} aria-hidden="true" /> Reativar acesso</Button>}
              {status !== 'CANCELADO' && <Button variant="danger" onClick={() => setConfirm('cancel')}><Trash2 size={15} aria-hidden="true" /> Cancelar acesso</Button>}
            </div>
          </div>
        ) : <p className="text-sm text-fg-sub">{own ? 'Este é o seu acesso.' : 'Seu perfil só pode consultar este usuário.'}</p>}>
        <div className="space-y-5">
          <nav aria-label="Seções do usuário" className="flex gap-1 overflow-x-auto border-b border-border">
            {TABS.map((item) => (
              <button key={item.id} type="button" aria-current={tab === item.id ? 'page' : undefined} onClick={() => { setTab(item.id); setFeedback(null); }}
                className={`min-h-11 whitespace-nowrap border-b-2 px-4 text-sm font-medium ${tab === item.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-fg-sub hover:text-fg'}`}>{item.label}</button>
            ))}
          </nav>

          {feedback && <p role={feedback.ok ? 'status' : 'alert'} className={`rounded-lg p-3 text-sm ${feedback.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{feedback.text}</p>}
          {status !== 'ATIVO' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Acesso {STATUS_LABEL[status].toLowerCase()}{user.blockedReason ? ` — ${user.blockedReason}` : ''}. {user.canceledAt ? `Cancelado em ${dateTime(user.canceledAt)}.` : user.blockedAt ? `Bloqueado em ${dateTime(user.blockedAt)}.` : ''}</p>}

          {tab === 'dados' && (
            <div className="space-y-5">
              <fieldset disabled={!manageable || saving} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium">Nome<input className={`${field} mt-1`} value={name} onChange={(e) => setName(e.target.value)} /></label>
                  <label className="block text-sm font-medium">E-mail<input type="email" className={`${field} mt-1`} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
                </div>
                <fieldset disabled={own} className="space-y-2">
                  <legend className="text-sm font-medium">Visão (o que este usuário enxerga)</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[...new Set<UserRole>([user.role, ...roleOptions])].map((value) => (
                      <label key={value} className={`cursor-pointer rounded-xl border p-2.5 text-sm transition ${role === value ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-border hover:bg-bg-sub'} ${roleOptions.includes(value) ? '' : 'opacity-60'}`}>
                        <input type="radio" name="edit-role" className="sr-only" disabled={!roleOptions.includes(value)} checked={role === value} onChange={() => setRole(value)} />
                        <span className="block font-semibold">{ROLE_INFO[value].label}</span><span className="block text-xs text-fg-sub">{ROLE_INFO[value].vision}</span>
                      </label>
                    ))}
                  </div>
                  {own && <p className="text-xs text-fg-sub">Você não pode alterar a própria visão.</p>}
                </fieldset>
                {manageable && <Button isLoading={saving} disabled={!generalDirty || !name.trim() || !email.trim()} onClick={saveGeneral}>Salvar alterações</Button>}
              </fieldset>

              <section className="space-y-3 rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Link2 size={15} aria-hidden="true" /> Vínculo com funcionário <span className="rounded bg-bg-sub px-1.5 py-0.5 text-[10px] font-medium text-fg-sub">opcional</span></h3>
                {user.employee ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div><p className="font-medium">{user.employee.name}</p><p className="text-xs text-fg-sub">Matrícula {user.employee.registration ?? '—'} · {user.employee.position ?? 'sem cargo'}{user.employee.department ? ` · ${user.employee.department}` : ''}</p></div>
                    {canLink && <Button variant="outline" size="sm" isLoading={saving} onClick={unlink}><Unlink size={14} aria-hidden="true" /> Desatrelar</Button>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-fg-sub">Sem vínculo: este usuário acessa somente conforme a visão acima. Atrelar a um funcionário traz matrícula, gestor e dados pessoais.</p>
                    {canLink && (
                      <>
                        <label className="relative block"><Search size={15} className="absolute left-3 top-3.5 text-fg-sub" aria-hidden="true" />
                          <input className={`${field} pl-9`} placeholder="Buscar funcionário sem acesso (nome, matrícula, e-mail)" value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)} aria-label="Buscar funcionário" /></label>
                        <ul className="max-h-40 divide-y divide-border overflow-auto rounded-xl border border-border">
                          {linkError && <li className="p-3 text-sm text-rose-700">{linkError}</li>}
                          {!linkError && linkOptions.length === 0 && <li className="p-3 text-sm text-fg-sub">Nenhum funcionário sem acesso encontrado. Cadastre o funcionário primeiro na área Funcionários.</li>}
                          {linkOptions.map((item) => <li key={item.id}><button type="button" disabled={linking} onClick={() => link(item)} className="w-full p-3 text-left text-sm hover:bg-bg-sub"><span className="block font-medium">{item.name}</span><span className="block text-xs text-fg-sub">Matrícula {item.registration ?? '—'} · {item.position ?? 'sem cargo'}</span></button></li>)}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </section>

              <dl className="grid gap-3 rounded-xl bg-bg-sub p-4 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-fg-sub">Último acesso</dt><dd>{user.lastActiveAt ? dateTime(user.lastActiveAt) : 'Nunca acessou'}</dd></div>
                <div><dt className="text-xs text-fg-sub">Criado em</dt><dd>{dateTime(user.createdAt)}</dd></div>
                <div><dt className="text-xs text-fg-sub">Empresa</dt><dd>{user.company?.name ?? '—'}</dd></div>
              </dl>
            </div>
          )}

          {tab === 'atividade' && <ActivityPanel userId={user.id} />}

          {tab === 'permissoes' && (
            <div className="space-y-4">
              <p className="text-sm text-fg-sub">Por padrão o usuário segue as permissões da visão <strong>{ROLE_INFO[user.role]?.label}</strong>. Personalize apenas se precisar de exceções.</p>
              <div className="flex gap-4 text-sm">
                <label className="flex min-h-11 items-center gap-2"><input type="radio" name="perm-mode" disabled={!manageable} checked={custom === null} onChange={() => setCustom(null)} />Padrão da visão</label>
                <label className="flex min-h-11 items-center gap-2"><input type="radio" name="perm-mode" disabled={!manageable} checked={custom !== null} onChange={() => setCustom(effectivePermissions)} />Personalizar</label>
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {Object.entries(PERMISSIONS_LABELS).map(([key, label]) => (
                  <label key={key} className="flex min-h-10 items-start gap-2.5 py-1.5 text-sm">
                    <input type="checkbox" className="mt-1 h-4 w-4" disabled={!manageable || custom === null} checked={effectivePermissions.includes(key)}
                      onChange={() => setCustom((current) => { const base = current ?? effectivePermissions; return base.includes(key) ? base.filter((v) => v !== key) : [...base, key]; })} />{label}
                  </label>
                ))}
              </div>
              {manageable && <Button isLoading={saving} disabled={!permsDirty} onClick={savePermissions}>Salvar permissões</Button>}
            </div>
          )}

          {tab === 'seguranca' && (
            <div className="space-y-4">
              <dl className="grid gap-3 rounded-xl bg-bg-sub p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-fg-sub">Última troca de senha</dt><dd>{dateTime(user.passwordChangedAt)}</dd></div>
                <div><dt className="text-xs text-fg-sub">Tentativas inválidas</dt><dd>{user.failedLoginAttempts ?? 0}</dd></div>
                <div><dt className="text-xs text-fg-sub">Troca obrigatória</dt><dd>{user.forcePasswordChange ? 'Sim, no próximo login' : 'Não'}</dd></div>
              </dl>
              {manageable ? (
                <section className="space-y-3 rounded-xl border border-border p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold"><KeyRound size={15} aria-hidden="true" /> Senha provisória</h3>
                  {temp
                    ? <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Repasse com segurança: <code className="select-all font-mono font-semibold">{temp.temporaryPassword}</code><span className="block text-xs">Válida até {dateTime(temp.expiresAt)}.</span></p>
                    : <p className="text-sm text-fg-sub">Disponível enquanto o usuário não trocar a senha do primeiro acesso. Gerar outra invalida a anterior.</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" isLoading={tempBusy === 'reveal'} disabled={!!tempBusy} onClick={() => password('reveal')}>Ver senha provisória</Button>
                    <Button variant="outline" isLoading={tempBusy === 'reissue'} disabled={!!tempBusy} onClick={() => password('reissue')}><ShieldCheck size={15} aria-hidden="true" /> Gerar nova senha</Button>
                  </div>
                </section>
              ) : <p className="text-sm text-fg-sub">Seu perfil não pode gerir a senha deste usuário.</p>}
            </div>
          )}
        </div>
      </Drawer>

      <Modal isOpen={confirm !== null} onClose={() => !acting && setConfirm(null)} title={confirm === 'cancel' ? 'Cancelar acesso?' : 'Bloquear acesso?'}
        description={confirm === 'cancel' ? 'O usuário perde o acesso definitivamente e é desatrelado do funcionário. Dá para reativar depois.' : 'O usuário não consegue entrar até você reativar. O vínculo e o histórico são mantidos.'}
        footer={<div className="flex justify-end gap-2"><Button variant="outline" disabled={acting} onClick={() => setConfirm(null)}>Voltar</Button><Button variant={confirm === 'cancel' ? 'danger' : 'primary'} isLoading={acting} onClick={confirmAction}>{confirm === 'cancel' ? 'Cancelar acesso' : 'Bloquear'}</Button></div>}>
        <label className="block text-sm font-medium">Motivo (fica registrado no histórico)
          <textarea className={`${field} mt-1 min-h-24`} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: desligamento, suspeita de uso indevido…" />
        </label>
      </Modal>
    </>
  );
}
