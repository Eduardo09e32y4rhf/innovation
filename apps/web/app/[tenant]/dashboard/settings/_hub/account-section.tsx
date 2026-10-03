'use client';

import { Check, Circle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { resolveUserRole } from '@/app/lib/user-role';
import { ROLE_LABELS } from './types';

const RULES: { label: string; test: (value: string) => boolean }[] = [
  { label: 'Mínimo de 10 caracteres', test: (v) => v.length >= 10 },
  { label: 'Letra maiúscula', test: (v) => /[A-Z]/.test(v) },
  { label: 'Letra minúscula', test: (v) => /[a-z]/.test(v) },
  { label: 'Número', test: (v) => /\d/.test(v) },
  { label: 'Caractere especial', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function AccountSection() {
  const { user, changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passed = RULES.filter((rule) => rule.test(next)).length;
  const valid = current.length > 0 && passed === RULES.length && next === confirm && next !== current;

  async function submit() {
    if (!valid) return;
    setSaving(true); setError(null);
    try {
      await changePassword(current, next);
      toast.success('Senha alterada.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível alterar a senha.');
    } finally { setSaving(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="card-v2 space-y-4 p-5">
        <h2 className="text-base font-semibold text-fg">Alterar senha</h2>
        {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium text-fg-sub">Senha atual
            <input type={show ? 'text' : 'password'} autoComplete="current-password" className="input-v2 mt-1 w-full" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-fg-sub">Nova senha
            <input type={show ? 'text' : 'password'} autoComplete="new-password" className="input-v2 mt-1 w-full" value={next} onChange={(e) => setNext(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-fg-sub">Confirmar
            <input type={show ? 'text' : 'password'} autoComplete="new-password" className="input-v2 mt-1 w-full" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={Boolean(confirm) && confirm !== next} />
          </label>
        </div>
        {confirm && confirm !== next && <p className="text-xs text-rose-600">As senhas não coincidem.</p>}
        <ul className="grid gap-1 text-xs sm:grid-cols-2" aria-label="Requisitos da senha">
          {RULES.map((rule) => {
            const ok = rule.test(next);
            return <li key={rule.label} className={`flex items-center gap-1.5 ${ok ? 'text-emerald-700' : 'text-fg-sub'}`}>{ok ? <Check size={13} aria-hidden="true" /> : <Circle size={11} aria-hidden="true" />}{rule.label}</li>;
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={submit} isLoading={saving} disabled={!valid}>Alterar senha</Button>
          <label className="flex items-center gap-2 text-xs text-fg-sub"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Mostrar senhas</label>
        </div>
      </section>

      <section className="card-v2 space-y-2 p-5 text-sm">
        <h2 className="text-base font-semibold text-fg">Minha conta</h2>
        <dl className="space-y-2">
          <div><dt className="text-xs text-fg-sub">Nome</dt><dd className="font-medium">{user?.name ?? '—'}</dd></div>
          <div><dt className="text-xs text-fg-sub">E-mail</dt><dd className="break-all font-medium">{user?.email ?? '—'}</dd></div>
          <div><dt className="text-xs text-fg-sub">Perfil</dt><dd className="font-medium">{ROLE_LABELS[resolveUserRole(user)] ?? '—'}</dd></div>
        </dl>
      </section>
    </div>
  );
}
