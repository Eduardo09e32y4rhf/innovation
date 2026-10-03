'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
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
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

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

      if (result.temporaryPassword) {
        setTemporaryPassword(result.temporaryPassword);
        toast.success('Acesso criado com sucesso!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar acesso');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (temporaryPassword) {
      navigator.clipboard.writeText(temporaryPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
      toast.success('Senha copiada para a área de transferência');
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('FUNCIONARIO');
    setName('');
    setTemporaryPassword(null);
    setCopiedPassword(false);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={handleClose} title="Criar Acesso">
      <div className="space-y-4">
        {!temporaryPassword ? (
          <>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
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
              <input
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
              <select
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
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900 mb-2">✓ Acesso criado com sucesso!</p>
              <p className="text-xs text-emerald-700">
                Compartilhe a senha provisória abaixo com o funcionário. Ela expira em 24 horas.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Senha Provisória:</label>
              <div className="flex gap-2 items-center">
                <code className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm font-mono break-all">
                  {temporaryPassword}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyPassword}
                  className="shrink-0"
                >
                  {copiedPassword ? (
                    <Check size={16} className="text-emerald-600" />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-700">
                <strong>⚠ Importante:</strong> A senha será exibida apenas uma vez. Copie-a com segurança.
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
