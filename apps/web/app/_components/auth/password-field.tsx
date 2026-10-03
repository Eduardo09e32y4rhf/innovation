'use client';

import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';
import { authInput } from './auth-shell';

export const PASSWORD_RULES: { label: string; test: (value: string) => boolean }[] = [
  { label: '10 ou mais caracteres', test: (v) => v.length >= 10 },
  { label: 'Letra maiúscula', test: (v) => /[A-Z]/.test(v) },
  { label: 'Letra minúscula', test: (v) => /[a-z]/.test(v) },
  { label: 'Número', test: (v) => /\d/.test(v) },
  { label: 'Símbolo', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export const isStrongPassword = (value: string) => PASSWORD_RULES.every((rule) => rule.test(value));

export function PasswordField({ label, value, onChange, autoComplete, disabled, showRules = false, name }: {
  label: string; value: string; onChange: (value: string) => void; autoComplete: 'current-password' | 'new-password';
  disabled?: boolean; showRules?: boolean; name?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</label>
      <div className="relative">
        <input id={id} name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} required disabled={disabled}
          className={`${authInput} pr-12`} value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" onClick={() => setVisible((v) => !v)} disabled={disabled} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-zinc-500 hover:text-zinc-800">
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {showRules && (
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-label="Requisitos da senha">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(value);
            return <li key={rule.label} className={`flex items-center gap-1.5 ${ok ? 'text-emerald-700' : 'text-zinc-500'}`}>{ok ? <Check size={13} aria-hidden="true" /> : <Circle size={10} aria-hidden="true" />}{rule.label}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
