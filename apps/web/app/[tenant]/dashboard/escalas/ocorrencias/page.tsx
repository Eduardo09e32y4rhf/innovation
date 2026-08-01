'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/platform-ui';
import { FileText, CheckCircle, XCircle, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMinutes } from '@/app/lib/format';

const TYPE_LABELS: Record<string, string> = {
  LATE_ARRIVAL: 'Atraso',
  EARLY_LEAVE: 'Saída antecipada',
  ABSENCE: 'Falta',
  MEDICAL_CERTIFICATE: 'Atestado',
  MANUAL_ADJUSTMENT: 'Ajuste manual',
  MISSING_PUNCH: 'Ponto incompleto',
  OVERTIME: 'Hora extra'
};

export default function OcorrenciasPage() {
  const { tenant } = useParams() as { tenant: string };
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, any>>({});
  
  const [form, setForm] = useState({
    employeeId: user?.id || '',
    type: 'MEDICAL_CERTIFICATE',
    date: new Date().toISOString().substring(0, 10),
    isPartial: false,
    durationMinutes: '',
    reason: ''
  });

  const isAdminOrRhOrGestor = ['ADMIN', 'RH', 'GESTOR'].includes(user?.role || '');

  const { data: employeesData } = useQuery(
    () => isAdminOrRhOrGestor ? api.employees.list() : Promise.resolve([]),
    [tenant, isAdminOrRhOrGestor]
  );
  const employees = (employeesData || []) as any[];

  const { data: occurrencesData, loading: isLoading, error, refetch } = useQuery(
    () => isAdminOrRhOrGestor ? api.timeOccurrences.list() : api.timeOccurrences.listByEmployee(user?.id || ''),
    ['occurrences', tenant]
  );
  
  const rawOccurrences = (occurrencesData || []) as any[];
  const occurrences = rawOccurrences.map(o => optimisticUpdates[o.id] ? { ...o, ...optimisticUpdates[o.id] } : o);

  const approveMutation = useMutation(
    (id: string) => api.timeOccurrences.approve(id),
    { 
      onSuccess: (_, id) => {
        setOptimisticUpdates(prev => ({ ...prev, [id]: { status: 'APPROVED' } }));
        refetch();
      }
    }
  );

  const rejectMutation = useMutation(
    (id: string) => api.timeOccurrences.reject(id),
    { 
      onSuccess: (_, id) => {
        setOptimisticUpdates(prev => ({ ...prev, [id]: { status: 'REJECTED' } }));
        refetch();
      }
    }
  );

  const createMutation = useMutation(
    (data: any) => api.timeOccurrences.create(data),
    {
      onSuccess: () => {
        setIsModalOpen(false);
        refetch();
      }
    }
  );

  if (isLoading && !occurrencesData) return <LoadingState label="Carregando ocorrências..." />;
  if (error) return <ErrorState message="Erro ao carregar ocorrências" retry={refetch} />;

  const filteredOccurrences = occurrences.filter((o: any) => filter === 'ALL' || o.status === filter);

  const stats = {
    pending: occurrences.filter((o: any) => o.status === 'PENDING').length,
    approved: occurrences.filter((o: any) => o.status === 'APPROVED').length,
    rejected: occurrences.filter((o: any) => o.status === 'REJECTED').length
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form };
    if (!form.isPartial) {
      delete payload.durationMinutes;
    }
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col md:flex-row justify-between md:items-center">
        <div>
          <h1 className="page-title">Ocorrências</h1>
          <p className="page-subtitle">Gerenciamento de justificativas, atestados e ajustes</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-nubank flex items-center gap-2 mt-4 md:mt-0"
        >
          <Plus size={18} />
          <span>Nova Ocorrência</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-stat border-l-4 border-yellow-400">
          <p className="card-stat-label">Total Pendentes</p>
          <p className="card-stat-value text-yellow-600">{stats.pending}</p>
        </div>
        <div className="card-stat border-l-4 border-green-500">
          <p className="card-stat-label">Aprovadas no Mês</p>
          <p className="card-stat-value text-green-600">{stats.approved}</p>
        </div>
        <div className="card-stat border-l-4 border-red-500">
          <p className="card-stat-label">Recusadas no Mês</p>
          <p className="card-stat-value text-red-600">{stats.rejected}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button 
          onClick={() => setFilter('ALL')} 
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'ALL' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Todas
        </button>
        <button 
          onClick={() => setFilter('PENDING')} 
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'PENDING' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Pendentes
        </button>
        <button 
          onClick={() => setFilter('APPROVED')} 
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'APPROVED' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Aprovadas
        </button>
        <button 
          onClick={() => setFilter('REJECTED')} 
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'REJECTED' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Recusadas
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {filteredOccurrences.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState title={`Não encontramos ocorrências ${filter !== 'ALL' ? 'com este filtro' : 'registradas'}.`} description={`Não encontramos ocorrências ${filter !== 'ALL' ? 'com este filtro' : 'registradas'}.`} />
            </motion.div>
          ) : (
            filteredOccurrences.map((occ: any) => (
              <motion.div 
                key={occ.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="card-flat flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4"
                style={{ 
                  borderLeftColor: occ.status === 'APPROVED' ? '#22c55e' : occ.status === 'REJECTED' ? '#ef4444' : '#eab308'
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{TYPE_LABELS[occ.type] || occ.type}</span>
                    <span className={`badge ${
                      occ.status === 'APPROVED' ? 'badge-active' : 
                      occ.status === 'REJECTED' ? 'badge-alert' : 'badge-warn'
                    }`}>
                      {occ.status === 'APPROVED' ? 'Aprovada' : occ.status === 'REJECTED' ? 'Recusada' : 'Pendente'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium text-gray-800">{occ.employee?.name}</span> • {new Date(occ.date).toLocaleDateString('pt-BR')} 
                    {occ.durationMinutes ? ` • ${formatMinutes(occ.durationMinutes)} (Parcial)` : ' • Dia Integral'}
                  </div>
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">
                    "{occ.reason}"
                  </p>
                </div>

                {isAdminOrRhOrGestor && occ.status === 'PENDING' && (
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => approveMutation.mutate(occ.id)}
                      disabled={approveMutation.loading}
                      className={`btn-outline text-green-600 border-green-600 hover:bg-green-50 flex items-center gap-1 px-3 py-1.5 ${approveMutation.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <CheckCircle size={16} /> Aprovar
                    </button>
                    <button 
                      onClick={() => rejectMutation.mutate(occ.id)}
                      disabled={rejectMutation.loading}
                      className={`btn-outline text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-1 px-3 py-1.5 ${rejectMutation.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <XCircle size={16} /> Recusar
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* MODAL NOVA OCORRÊNCIA */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-gray-800">Lançar Nova Ocorrência</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {isAdminOrRhOrGestor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador</label>
                    <select 
                      required 
                      className="form-control w-full"
                      value={form.employeeId}
                      onChange={e => setForm(prev => ({ ...prev, employeeId: e.target.value }))}
                    >
                      <option value="">Selecione...</option>
                      {employees.map((e: any) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data da Ocorrência</label>
                    <input 
                      required 
                      type="date" 
                      className="form-control w-full"
                      value={form.date}
                      onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ocorrência</label>
                    <select 
                      required 
                      className="form-control w-full"
                      value={form.type}
                      onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="MEDICAL_CERTIFICATE">Atestado Médico</option>
                      <option value="MANUAL_ADJUSTMENT">Ajuste Manual</option>
                      <option value="LATE_ARRIVAL">Atraso Justificado</option>
                      <option value="ABSENCE">Falta Justificada</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isPartial"
                    className="rounded border-gray-300 text-brand"
                    checked={form.isPartial}
                    onChange={e => setForm(prev => ({ ...prev, isPartial: e.target.checked }))}
                  />
                  <label htmlFor="isPartial" className="text-sm font-medium text-gray-700">
                    Atestado/Ocorrência Parcial (Apenas algumas horas do dia)
                  </label>
                </div>

                {form.isPartial && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duração (em minutos)</label>
                    <input 
                      required 
                      type="number" 
                      className="form-control w-full"
                      placeholder="Ex: 180 para 3 horas"
                      value={form.durationMinutes}
                      onChange={e => setForm(prev => ({ ...prev, durationMinutes: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Tempo em minutos a ser abonado da jornada.</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Justificativa / Motivo</label>
                  <textarea 
                    required 
                    rows={3}
                    className="form-control w-full"
                    placeholder="Descreva o motivo da ocorrência ou atestado..."
                    value={form.reason}
                    onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                  <button type="submit" className="btn-nubank" disabled={createMutation.loading}>
                    {createMutation.loading ? 'Enviando...' : 'Registrar Ocorrência'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
