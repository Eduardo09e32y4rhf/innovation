'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/app/lib/api';

interface UserPasswordResetModalProps {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserPasswordResetModal({ user, onClose, onSuccess }: UserPasswordResetModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!user) return;
    setLoading(true);
    try {
      await api.users.resetPassword(user.id);
      toast.success('Senha redefinida com sucesso.');
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
        <p className="mb-6 text-sm text-slate-600">
          Tem certeza de que deseja redefinir a senha do usuario <strong>{user.name}</strong> para o padrao (12345678)?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
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
