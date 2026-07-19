'use client';

import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/app/lib/api';

interface UserPasswordResetModalProps {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserPasswordResetModal({ user, onClose, onSuccess }: UserPasswordResetModalProps) {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleReset() {
    if (!user || !newPassword) return;

    if (newPassword.length < 10) {
      toast.error('A senha temporária deve ter no mínimo 10 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await api.users.resetPassword(user.id, { newPassword });
      toast.success(`Senha de ${user.name} redefinida. O usuário deverá trocar no próximo login.`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-[16px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-950">Redefinir Senha</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Defina uma senha temporária forte para <strong>{user.name}</strong>. O usuário será obrigado a trocar a senha no próximo login.
        </p>

        <div className="mb-6">
          <label className="mb-1 block text-xs font-bold text-slate-700">Senha Temporária</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 10 caracteres"
              className="w-full rounded-[10px] border border-slate-200 px-3 py-2 pr-10 text-sm outline-none focus:border-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {newPassword.length > 0 && newPassword.length < 10 && (
            <p className="mt-1 text-xs text-red-500">Mínimo 10 caracteres</p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleReset}
            disabled={loading || newPassword.length < 10}
            className="crystal-button rounded-[8px] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            {loading ? 'Redefinindo...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserPasswordResetModal;
