'use client';

import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { resolveUserRole } from '@/app/lib/user-role';
import { cardClass, errorText, inputClass, ROLE_LABELS } from './types';

const RULES: { label: string; test: (value: string) => boolean }[] = [
  { label: 'Mínimo de 10 caracteres', test: (v) => v.length >= 10 },
  { label: 'Letra maiúscula', test: (v) => /[A-Z]/.test(v) },
  { label: 'Letra minúscula', test: (v) => /[a-z]/.test(v) },
  { label: 'Número', test: (v) => /\d/.test(v) },
  { label: 'Caractere especial (!@#$...)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];
const STRENGTH = [
  { label: 'Muito fraca', bar: 'bg-rose-500' }, { label: 'Fraca', bar: 'bg-rose-400' }, { label: 'Média', bar: 'bg-amber-400' },
  { label: 'Boa', bar: 'bg-lime-500' }, { label: 'Forte', bar: 'bg-emerald-500' }, { label: 'Excelente', bar: 'bg-emerald-600' },
];

export function AccountSection() {
  const { user, company, changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passed = RULES.filter((rule) => rule.test(next)).length;
  const strength = next ? STRENGTH[passed] : null;
  const mismatch = Boolean(confirm) && confirm !== next;
  const valid = current.length > 0 && passed === RULES.length && next === confirm && next !== current;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true); setError(null);
    try {
      await changePassword(current, next);
      toast.success('Senha alterada com sucesso.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (cause) {
      setError(errorText(cause, 'Não foi possível alterar a senha. Confira a senha atual.'));
    } finally { setSaving(false); }
  }

  const info: Array<[string, string]> = [
    ['Nome', user?.name ?? '—'],
    ['E-mail de acesso', user?.email ?? '—'],
    ['Perfil', ROLE_LABELS[resolveUserRole(user)] ?? '—'],
    ['Empresa', company?.name ?? '—'],
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={submit} className={`${cardClass} space-y-4`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-fg">Alterar senha</h3>
          <button type="button" onClick={() => setShow((v) => !v)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-sub hover:text-fg">
            {show ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />} {show ? 'Ocultar' : 'Mostrar'} senhas
          </button>
        </div>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
        <label className="block text-sm font-medium text-fg-sub">Senha atual
          <input type={show ? 'text' : 'password'} autoComplete="current-password" className={inputClass} value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-fg-sub">Nova senha
            <input type={show ? 'text' : 'password'} autoComplete="new-password" className={inputClass} value={next} onChange={(e) => setNext(e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-fg-sub">Repita a nova senha
            <input type={show ? 'text' : 'password'} autoComplete="new-password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={mismatch} />
          </label>
        </div>
        {mismatch && <p className="text-xs font-semibold text-rose-600">As senhas não são iguais.</p>}
        {next && next === current && <p className="text-xs font-semibold text-rose-600">A nova senha precisa ser diferente da atual.</p>}
        {strength && (
          <div>
            <div className="flex gap-1" aria-hidden="true">{RULES.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < passed ? strength.bar : 'bg-bg-sub'}`} />)}</div>
            <p className="mt-1 text-xs font-semibold text-fg-sub">Força: {strength.label}</p>
          </div>
        )}
        <ul className="grid gap-1 text-xs sm:grid-cols-2" aria-label="Requisitos da senha">
          {RULES.map((rule) => {
            const ok = rule.test(next);
            return <li key={rule.label} className={`flex items-center gap-1.5 ${ok ? 'font-semibold text-emerald-700' : 'text-fg-sub'}`}>{ok ? <Check size={13} aria-hidden="true" /> : <Circle size={11} aria-hidden="true" />}{rule.label}</li>;
          })}
        </ul>
        <Button type="submit" isLoading={saving} disabled={!valid}>Salvar nova senha</Button>
      </form>

      <section className={`${cardClass} space-y-4`}>
        <h3 className="text-base font-bold text-fg">Minha conta</h3>
        <dl className="space-y-3 text-sm">
          {info.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-fg-mut">{label}</dt><dd className="break-words font-medium text-fg">{value}</dd></div>)}
        </dl>
        <p className="rounded-xl bg-bg-sub p-3 text-xs text-fg-sub">Para mudar nome ou e-mail, peça ao RH ou ao administrador da empresa.</p>
      </section>
    </div>
  );
}
