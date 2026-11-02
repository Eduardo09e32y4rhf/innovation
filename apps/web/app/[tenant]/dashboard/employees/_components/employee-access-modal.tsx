'use client';

import { useState } from 'react';
import { Button, Modal } from '@/app/components/ui';
import { api } from '@/app/lib/api';
import { toast } from 'sonner';

export function EmployeeAccessModal({
  employeeId,
  onClose,
  onSuccess,
}: {
  employeeId: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('FUNCIONARIO');
  const [name, setName] = useState('');
  const [emailFailed, setEmailFailed] = useState(false);

  const handleCreateAccess = async () => {
    if (!email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const result = await api.employees.createAccess(employeeId, {
        email: email.trim().toLowerCase(),
        role,
        name: name.trim() || undefined,
      });

      if (result.emailSent) {
        toast.success('Acesso criado. A pessoa vai receber um e-mail para criar a própria senha.');
        onSuccess?.();
        handleClose();
      } else if (result.success) {
        setEmailFailed(true);
        toast.error('Acesso criado, mas não foi possível enviar o e-mail de boas-vindas.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar acesso');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('FUNCIONARIO');
    setName('');
    setEmailFailed(false);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={handleClose} title="Criar Acesso">
      <div className="space-y-4">
        {!emailFailed ? (
          <>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input aria-label="E-mail de acesso do funcionário"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="funcionario@empresa.com"
                disabled={loading}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm mt-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nome (opcional)</label>
              <input aria-label="Nome do funcionário"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="João da Silva"
                disabled={loading}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm mt-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Perfil de Acesso</label>
              <select aria-label="Perfil de acesso"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm mt-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="FUNCIONARIO">Funcionário</option>
                <option value="GESTOR">Gestor</option>
                <option value="RH">RH</option>
                <option value="ADMIN">Administrador</option>
                <option value="CONSULTA">Consulta</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAccess} isLoading={loading}>
                Criar Acesso
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900 mb-2">Acesso criado, mas o e-mail não foi enviado.</p>
              <p className="text-xs text-amber-700">
                Peça para <strong>{email}</strong> usar &quot;Esqueci minha senha&quot; na tela de login para criar o acesso, ou verifique a configuração de e-mail do sistema.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Concluído
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
