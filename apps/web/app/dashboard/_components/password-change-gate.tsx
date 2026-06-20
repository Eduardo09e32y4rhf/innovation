'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

export function PasswordChangeGate({ children }: { children: React.ReactNode }) {
  const { passwordChangeRequired, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  if (!passwordChangeRequired) return <>{children}</>;

  const valid = newPassword.length >= 10 && newPassword === confirmPassword && /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) && /\d/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    try {
      await changePassword(currentPassword, newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível trocar a senha.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/85 px-4 py-6 backdrop-blur-sm">
      <section className="w-full max-w-lg rounded-[18px] border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-slate-950 text-white"><ShieldCheck size={21} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-700">Segurança obrigatória</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Troque sua senha</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Por segurança, a senha deve ser alterada a cada 30 dias. Use uma senha forte para continuar.</p>
          </div>
        </div>
        {error && <p className="mt-4 rounded-[10px] border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
        <div className="mt-5 grid gap-3">
          <PasswordField label="Senha atual" value={currentPassword} onChange={setCurrentPassword} />
          <PasswordField label="Nova senha" value={newPassword} onChange={setNewPassword} />
          <PasswordField label="Confirmar nova senha" value={confirmPassword} onChange={setConfirmPassword} />
          <p className="text-xs font-semibold text-slate-500">Mínimo 10 caracteres, com maiúscula, minúscula, número e símbolo.</p>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button onClick={logout} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Sair</button>
          <button onClick={submit} disabled={!valid || saving} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">{saving ? 'Salvando...' : 'Trocar senha'}</button>
        </div>
      </section>
    </div>
  );
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1 text-xs font-medium text-slate-600"><span>{label}</span><input type="password" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>;
}