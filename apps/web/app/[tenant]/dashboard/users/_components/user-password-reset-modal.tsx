'use client';

import React, { useEffect, useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface UserPasswordResetModalProps {
  isOpen?: boolean;
  user: any;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<unknown>;
}

export function UserPasswordResetModal({ isOpen = true, user, onClose, onSubmit }: UserPasswordResetModalProps) {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const passwordHasMinimumLength = newPassword.length >= 10;
  const passwordHasLowercase = /[a-z]/.test(newPassword);
  const passwordHasUppercase = /[A-Z]/.test(newPassword);
  const passwordHasNumber = /\d/.test(newPassword);
  const passwordHasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const passwordIsStrong =
    passwordHasMinimumLength && passwordHasLowercase && passwordHasUppercase && passwordHasNumber && passwordHasSymbol;

  useEffect(() => {
    if (!isOpen || !user) {
      setNewPassword('');
      setShowPassword(false);
      setLoading(false);
    }
  }, [isOpen, user]);

  async function handleReset() {
    if (!user || !newPassword) return;

    if (!passwordIsStrong) {
      toast.error('A senha temporária precisa ter 10+ caracteres, maiúscula, minúscula, número e símbolo.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(newPassword);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <div className="card-v2 w-full max-w-md bg-bg-elev p-6 shadow-v2-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-950">Redefinir senha</h3>
          <button onClick={onClose} aria-label="Fechar redefinição de senha" className="flex h-8 w-8 items-center justify-center rounded-full text-fg-mut transition-colors hover:bg-bg-sub hover:text-fg">
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Defina uma senha temporária forte para <strong>{user.name}</strong>. O usuário será obrigado a trocar a senha no
          próximo login.
        </p>

        <div className="mb-6">
          <label className="mb-1 block text-xs font-bold text-slate-700">Senha temporária</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 10 caracteres"
              className="input-v2 w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-mut hover:text-fg"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {newPassword.length > 0 && !passwordIsStrong && (
            <p className="mt-1 text-xs text-red-500">
              Use 10+ caracteres com letra maiúscula, minúscula, número e símbolo.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-v2-outline">
            Cancelar
          </button>
          <button
            onClick={handleReset}
            disabled={loading || !passwordIsStrong}
            className="btn-v2-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Redefinindo...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserPasswordResetModal;
