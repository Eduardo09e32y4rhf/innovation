'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button, Modal } from '@/app/components/ui';
import { PasswordField, PasswordPolicy, isStrongPassword } from './password-field';
import { useAccessOverlay } from './use-access-overlay';
import { AccessConfirmDialog } from './access-confirm-dialog';

interface UserPasswordResetModalProps {
  isOpen?: boolean;
  user: { id: string; name: string; email?: string } | null;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<unknown>;
}

export function UserPasswordResetModal({ isOpen = true, user, onClose, onSubmit }: UserPasswordResetModalProps) {
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState(false);
  const policyId = useId();
  const open = isOpen && !!user;
  function close() {
    if (busy.current) return;
    if (password || confirmation) setDiscard(true);
    else onClose();
  }
  const ref = useAccessOverlay(open && !discard, close, 'Redefinir senha temporária');
  useEffect(() => {
    setPassword(''); setConfirmation(''); setError(''); setDiscard(false);
  }, [isOpen, user?.id]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || !user || !isStrongPassword(password) || password !== confirmation) return;
    busy.current = true; setLoading(true); setError('');
    try {
      await onSubmit(password);
      setPassword(''); setConfirmation(''); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.');
    } finally { busy.current = false; setLoading(false); }
  }
  return <>
    <div ref={ref}><Modal isOpen={open && !discard} onClose={close} title="Redefinir senha temporária"
      description={`${user?.name ?? ''}${user?.email ? ` · ${user.email}` : ''}`}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-fg-mut">A troca será obrigatória no próximo login. A senha deve ser diferente da atual e das senhas anteriores.</p>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <PasswordField label="Senha temporária" value={password} onChange={setPassword} disabled={loading} descriptionId={policyId} />
        <PasswordField label="Confirmar senha temporária" value={confirmation} onChange={setConfirmation} disabled={loading}
          error={confirmation && password !== confirmation ? 'As senhas não coincidem.' : undefined} />
        <PasswordPolicy password={password} id={policyId} />
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={close} disabled={loading}>Cancelar</Button>
          <Button type="submit" isLoading={loading} disabled={!isStrongPassword(password) || password !== confirmation}>Redefinir senha</Button>
        </div>
      </form>
    </Modal></div>
    <AccessConfirmDialog isOpen={discard} onClose={() => setDiscard(false)} onConfirm={() => { setDiscard(false); onClose(); }}
      title="Descartar senha digitada?" description="A senha não será alterada." confirmText="Descartar edição" />
  </>;
}
export default UserPasswordResetModal;
