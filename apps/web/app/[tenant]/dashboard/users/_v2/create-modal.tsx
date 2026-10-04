'use client';

import { Check, Copy, Link2, Search, UserRound } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { api, type CreatedUser, type LinkableEmployee, type UserRole } from '@/app/lib/api';
import { ROLE_INFO, dateTime } from './policy';

type Mode = 'employee' | 'free';
const field = 'input-v2 min-h-11 w-full text-base sm:text-sm';

export function CreateUserModal({ isOpen, onClose, roles, isDev, companies, defaultCompanyId, onCreated }: {
  isOpen: boolean; onClose: () => void; roles: UserRole[]; isDev: boolean;
  companies: { id: string; name: string }[]; defaultCompanyId?: string; onCreated: () => void;
}) {
  const [mode, setMode] = useState<Mode>('employee');
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? '');
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<LinkableEmployee[]>([]);
  const [searching, setSearching] = useState(false);
  const [employee, setEmployee] = useState<LinkableEmployee | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('FUNCIONARIO');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedUser | null>(null);
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    setMode('employee'); setSearch(''); setOptions([]); setEmployee(null); setName(''); setEmail(''); setError(''); setCreated(null); setCopied(false);
    setRole(roles.includes('FUNCIONARIO') ? 'FUNCIONARIO' : roles[0] ?? 'FUNCIONARIO'); setCompanyId(defaultCompanyId ?? '');
  }, [isOpen, defaultCompanyId, roles]);

  useEffect(() => {
    if (!isOpen || mode !== 'employee' || employee || (isDev && !companyId)) return;
    setSearching(true);
    const timer = window.setTimeout(() => {
      api.users.linkableEmployees(search, isDev ? companyId : undefined).then(setOptions).catch(() => setOptions([])).finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isOpen, mode, search, employee, companyId, isDev]);

  function pick(item: LinkableEmployee) {
    setEmployee(item); setName(item.name); setEmail(item.email ?? '');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    if (mode === 'employee' && !employee) return setError('Escolha o funcionário que vai receber o acesso.');
    if (isDev && !companyId) return setError('Escolha a empresa.');
    busy.current = true; setSaving(true); setError('');
    try {
      const result = await api.users.create({ name: name.trim(), email: email.trim().toLowerCase(), role, ...(employee ? { employeeId: employee.id } : {}), ...(isDev ? { companyId } : {}) });
      setCreated(result); onCreated();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível criar o acesso.';
      setError(/SEAT_LIMIT|licen/i.test(message) ? 'A empresa usou todas as licenças contratadas. Aumente as licenças em Plano e cobrança para liberar novos acessos.' : message);
    } finally { busy.current = false; setSaving(false); }
  }

  async function copy() {
    if (!created?.temporaryPassword) return;
    try { await navigator.clipboard.writeText(created.temporaryPassword); setCopied(true); toast.success('Senha copiada.'); }
    catch { toast.error('Não foi possível copiar. Selecione e copie manualmente.'); }
  }

  if (created) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Acesso criado" footer={<Button onClick={onClose}>Concluir</Button>}>
        <div className="space-y-3 text-sm">
          <p><strong>{created.name}</strong> já pode entrar com <strong>{created.email}</strong> e a senha provisória abaixo. Ela troca a senha no primeiro acesso.</p>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <code className="select-all break-all font-mono text-sm font-semibold text-amber-900">{created.temporaryPassword}</code>
            <Button variant="outline" size="sm" onClick={copy}>{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {copied ? 'Copiada' : 'Copiar'}</Button>
          </div>
          <p className="text-xs text-fg-sub">Válida até {dateTime(created.temporaryPasswordExpiresAt)}. Repasse com segurança — depois você ainda pode gerar outra na aba Segurança.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo acesso" description="Atrelar a um funcionário é opcional." maxWidth="max-w-xl"
      footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button><Button type="submit" form="create-user-form" isLoading={saving}>Criar acesso</Button></div>}>
      <form id="create-user-form" onSubmit={submit} className="space-y-4">
        <div role="radiogroup" aria-label="Quem vai receber o acesso" className="grid gap-2 sm:grid-cols-2">
          {([
            ['employee', Link2, 'Funcionário já cadastrado', 'Atrela ao cadastro: matrícula, gestor e dados.'],
            ['free', UserRound, 'Pessoa sem cadastro', 'Acessa apenas conforme a visão (perfil) escolhida.'],
          ] as const).map(([id, Icon, title, text]) => (
            <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => { setMode(id); setEmployee(null); setError(''); }}
              className={`rounded-xl border p-3 text-left transition ${mode === id ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-border hover:bg-bg-sub'}`}>
              <span className="flex items-center gap-2 text-sm font-semibold"><Icon size={16} aria-hidden="true" />{title}</span><span className="mt-1 block text-xs text-fg-sub">{text}</span>
            </button>
          ))}
        </div>

        {isDev && (
          <label className="block text-sm font-medium">Empresa
            <select required className={`${field} mt-1`} value={companyId} onChange={(e) => { setCompanyId(e.target.value); setEmployee(null); }}>
              <option value="">Selecione…</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}

        {mode === 'employee' && !employee && (
          <div className="space-y-2">
            <label className="relative block text-sm font-medium">Buscar funcionário sem acesso
              <Search size={16} className="absolute left-3 top-[38px] text-fg-sub" aria-hidden="true" />
              <input className={`${field} mt-1 pl-9`} placeholder="Nome, matrícula ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} disabled={isDev && !companyId} />
            </label>
            <ul className="max-h-48 divide-y divide-border overflow-auto rounded-xl border border-border">
              {searching && <li className="p-3 text-sm text-fg-sub">Buscando…</li>}
              {!searching && options.length === 0 && <li className="p-3 text-sm text-fg-sub">{isDev && !companyId ? 'Escolha a empresa primeiro.' : 'Nenhum funcionário sem acesso encontrado.'}</li>}
              {options.map((item) => (
                <li key={item.id}><button type="button" onClick={() => pick(item)} className="w-full p-3 text-left text-sm hover:bg-bg-sub">
                  <span className="block font-medium">{item.name}</span><span className="block text-xs text-fg-sub">Matrícula {item.registration ?? '—'} · {item.position ?? 'sem cargo'}{item.department ? ` · ${item.department}` : ''}</span>
                </button></li>
              ))}
            </ul>
          </div>
        )}

        {(mode === 'free' || employee) && (
          <>
            {employee && <p className="flex items-center justify-between rounded-xl bg-purple-50 px-3 py-2 text-sm"><span>Atrelado a <strong>{employee.name}</strong> · matrícula {employee.registration ?? '—'}</span><button type="button" className="text-xs font-semibold text-purple-700 underline" onClick={() => setEmployee(null)}>trocar</button></p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">Nome<input required className={`${field} mt-1`} value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="block text-sm font-medium">E-mail de acesso<input required type="email" className={`${field} mt-1`} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            </div>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Visão (perfil de acesso)</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {roles.map((value) => (
                  <label key={value} className={`cursor-pointer rounded-xl border p-2.5 text-sm transition ${role === value ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-border hover:bg-bg-sub'}`}>
                    <input type="radio" name="role" className="sr-only" checked={role === value} onChange={() => setRole(value)} />
                    <span className="block font-semibold">{ROLE_INFO[value].label}</span><span className="block text-xs text-fg-sub">{ROLE_INFO[value].vision}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="text-xs text-fg-sub">Uma senha provisória forte é gerada automaticamente e mostrada uma única vez.</p>
          </>
        )}
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </form>
    </Modal>
  );
}
