import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/app/components/ui';

export function passwordRequirements(password: string) {
  return [
    [password.length >= 10, 'Mínimo de 10 caracteres'],
    [/[A-Z]/.test(password), 'Uma letra maiúscula'],
    [/[a-z]/.test(password), 'Uma letra minúscula'],
    [/\d/.test(password), 'Um número'],
    [/[^A-Za-z0-9]/.test(password), 'Um símbolo'],
  ] as const;
}
export function isStrongPassword(password: string) {
  return passwordRequirements(password).every(([valid]) => valid);
}
export function PasswordField({ label, value, onChange, autoComplete = 'new-password', disabled = false, error, descriptionId }: {
  label: string; value: string; onChange: (value: string) => void;
  autoComplete?: string; disabled?: boolean; error?: string; descriptionId?: string;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium text-fg">{label}</label>
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} required value={value}
        disabled={disabled} onChange={event => onChange(event.target.value)} aria-invalid={!!error}
        aria-describedby={[descriptionId, error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
        className="input-v2 min-h-11 w-full pr-14 text-base sm:text-sm" />
      <Button type="button" variant="ghost" className="absolute right-0 top-0 min-h-11 min-w-11 px-3"
        aria-label={`${show ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-pressed={show}
        disabled={disabled} onClick={() => setShow(current => !current)}>
        {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </Button>
    </div>
    {error && <p id={`${id}-error`} className="text-sm text-rose-700">{error}</p>}
  </div>;
}
export function PasswordPolicy({ password, id }: { password: string; id?: string }) {
  const checks = passwordRequirements(password);
  const score = checks.filter(([valid]) => valid).length;
  return <div id={id} className="rounded-xl border border-border bg-bg-sub p-4 text-sm text-fg-mut">
    <p className="mb-2 font-medium text-fg">Requisitos da senha{password ? ` · ${score}/5 atendidos` : ''}</p>
    <ul className="space-y-1">{checks.map(([valid, label]) => <li key={label} className={password && valid ? 'text-emerald-700' : ''}>
      {password ? (valid ? '✓ ' : '○ ') : ''}{label}
    </li>)}</ul>
  </div>;
}
