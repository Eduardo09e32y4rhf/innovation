'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/platform-ui';
import { formatMinutes } from '@/app/lib/format';
import { ChevronLeft, ChevronRight, Clock, Download, CheckCircle, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function PontoPage() {
  const { tenant } = useParams() as { tenant: string };
  const { user } = useAuth();
  const router = useRouter();
  
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(user?.id || 'all');
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, any>>({});

  // Modal States
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    employeeId: user?.id || '',
    date: new Date().toISOString().substring(0, 10),
    entry: '',
    lunchStart: '',
    lunchReturn: '',
    exit: '',
    reason: 'ajuste_erro_marcacao' as any,
    observation: ''
  });

  const isAdminOrRh = ['ADMIN', 'RH', 'GESTOR'].includes(user?.role || '');

  const { data: employeesData } = useQuery(
    () => isAdminOrRh ? api.employees.list() : Promise.resolve([]),
    [tenant, isAdminOrRh]
  );
  const employees = (employeesData || []) as any[];

  const { data: timeRecordsData, loading: isLoading, error, refetch } = useQuery(
    () => {
      if (!isAdminOrRh || selectedEmployeeId !== 'all') {
        const empId = selectedEmployeeId === 'all' ? user?.id : selectedEmployeeId;
        return api.timeTrack.listEmployeeMonth(empId as string, currentMonth);
      }
      return api.timeTrack.list(currentMonth);
    },
    [tenant, currentMonth, selectedEmployeeId, isAdminOrRh, user?.id]
  );
  
  // Apply optimistic updates
  const rawRecords = (timeRecordsData || []) as any[];
  const timeRecords = rawRecords.map(r => 
    optimisticUpdates[r.id] ? { ...r, ...optimisticUpdates[r.id] } : r
  );

  const approveBatchMutation = useMutation(
    (ids: string[]) => api.timeTrack.batchApprove(ids, true),
    { 
      onSuccess: (_, ids) => {
        // Atualização Otimista
        const updates: Record<string, any> = {};
        ids.forEach(id => { updates[id] = { status: 'APPROVED' }; });
        setOptimisticUpdates(prev => ({ ...prev, ...updates }));
        refetch();
      }
    }
  );

  const manualAdjustMutation = useMutation(
    (data: any) => api.timeTrack.manual(data),
    {
      onSuccess: () => {
        setIsManualModalOpen(false);
        refetch();
      }
    }
  );

  const handlePrevMonth = () => {
    const d = new Date(`${currentMonth}-01T00:00:00`);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d.toISOString().substring(0, 7));
  };

  const handleNextMonth = () => {
    const d = new Date(`${currentMonth}-01T00:00:00`);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d.toISOString().substring(0, 7));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    manualAdjustMutation.mutate(manualForm as any);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': case 'NORMAL': return 'bg-green-50 text-green-700 border-l-4 border-green-500';
      case 'PENDING': return 'bg-yellow-50 text-yellow-700 border-l-4 border-yellow-500';
      case 'ISSUE': case 'REJECTED': return 'bg-red-50 text-red-700 border-l-4 border-red-500';
      default: return '';
    }
  };

  if (isLoading && !timeRecordsData) return <LoadingState label="Carregando espelho de ponto..." />;
  if (error) return <ErrorState message="Erro ao carregar registros de ponto" retry={refetch} />;

  const pendingIds = timeRecords?.filter((r: any) => r.status === 'PENDING').map((r: any) => r.id) || [];

  const summary = React.useMemo(() => {
    if (!timeRecords.length) return { worked: 0, extra: 0, absences: 0, delays: 0 };
    
    const worked = timeRecords.reduce((sum: number, r: any) => sum + (r.totalWorked || r.totalMinutes || 0), 0);
    const extra = timeRecords.reduce((sum: number, r: any) => 
      sum + (r.overtime50Minutes || 0) + (r.overtime100Minutes || 0), 0);
    const absences = timeRecords.filter((r: any) => 
      r.incidentType === 'ABSENCE' || r.incidentType === 'UNJUSTIFIED_ABSENCE').length;
    const delays = timeRecords.reduce((sum: number, r: any) => sum + (r.lateMinutes || 0), 0);
    
    return { worked, extra, absences, delays };
  }, [timeRecords]);

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col md:flex-row justify-between md:items-center">
        <div>
          <h1 className="page-title">Controle de Ponto</h1>
          <p className="page-subtitle">Acompanhe os registros de jornada de trabalho</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          {isAdminOrRh && (
            <button 
              onClick={() => setIsManualModalOpen(true)}
              className="btn-outline flex items-center gap-2"
            >
              <Plus size={18} />
              <span>Ajuste Manual</span>
            </button>
          )}
          <Link href={`/${tenant}/dashboard/time-track/clock-in`} className="btn-nubank flex items-center gap-2">
            <Clock size={18} />
            <span>Bater Ponto</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={handlePrevMonth} className="btn-icon p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft size={20} />
          </button>
          <span className="font-medium text-lg min-w-[120px] text-center">
            {new Date(`${currentMonth}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={handleNextMonth} className="btn-icon p-2 hover:bg-gray-100 rounded-full">
            <ChevronRight size={20} />
          </button>
        </div>

        {isAdminOrRh && (
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              className="form-control"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="all">Todos Funcionários</option>
              {employees?.map((e: any) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-stat">
          <p className="card-stat-label">Horas Trabalhadas</p>
          <p className="card-stat-value text-brand">{formatMinutes(summary.worked)}</p>
        </div>
        <div className="card-stat">
          <p className="card-stat-label">Horas Extras</p>
          <p className="card-stat-value text-green-600">+{formatMinutes(summary.extra)}</p>
        </div>
        <div className="card-stat">
          <p className="card-stat-label">Faltas</p>
          <p className="card-stat-value text-red-500">{summary.absences} dias</p>
        </div>
        <div className="card-stat">
          <p className="card-stat-label">Atrasos</p>
          <p className="card-stat-value text-yellow-600">{formatMinutes(summary.delays)}</p>
        </div>
      </div>

      <div className="content-section">
        <div className="flex justify-between items-center mb-4">
          <h2 className="section-title">Registros do Mês</h2>
          <div className="flex gap-2">
            {isAdminOrRh && pendingIds.length > 0 && (
              <button 
                onClick={() => approveBatchMutation.mutate(pendingIds)}
                disabled={approveBatchMutation.loading}
                className={`btn-outline flex items-center gap-2 text-green-600 border-green-600 hover:bg-green-50 ${approveBatchMutation.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <CheckCircle size={16} /> 
                {approveBatchMutation.loading ? 'Aprovando...' : `Aprovar Pendentes (${pendingIds.length})`}
              </button>
            )}
            <button 
              onClick={async () => {
                const monthParam = currentMonth;
                const empIds = selectedEmployeeId === 'all' ? undefined : [selectedEmployeeId];
                try {
                  await api.documents.downloadCollective(monthParam, empIds);
                } catch {
                  toast.error('Erro ao exportar PDF');
                }
              }}
              className="btn-outline flex items-center gap-2"
            >
              <Download size={16} /> Exportar PDF
            </button>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table w-full text-left">
            <thead>
              <tr>
                <th>Data</th>
                {isAdminOrRh && selectedEmployeeId === 'all' && <th>Colaborador</th>}
                <th>Entrada</th>
                <th>Almoço</th>
                <th>Saída</th>
                <th>Total</th>
                <th>Saldo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {timeRecords?.length === 0 ? (
                <tr>
                  <td colSpan={isAdminOrRh && selectedEmployeeId === 'all' ? 8 : 7} className="text-center py-8 text-gray-500">
                    <EmptyState title="Não há marcações de ponto neste período." description="Tente alterar o filtro ou data." />
                  </td>
                </tr>
              ) : (
                timeRecords?.map((record: any) => (
                  <tr key={record.id} className={getStatusColor(record.status)}>
                    <td className="font-medium">{new Date(record.date).toLocaleDateString('pt-BR')}</td>
                    {isAdminOrRh && selectedEmployeeId === 'all' && (
                      <td>{record.employee?.name || '-'}</td>
                    )}
                    <td>{record.punchIn || '--:--'}</td>
                    <td>{record.breakOut || '--:--'} - {record.breakIn || '--:--'}</td>
                    <td>{record.punchOut || '--:--'}</td>
                    <td className="font-medium">{formatMinutes(record.totalMinutes || 0)}</td>
                    <td className={record.balanceMinutes > 0 ? 'text-green-600' : record.balanceMinutes < 0 ? 'text-red-500' : ''}>
                      {record.balanceMinutes > 0 ? '+' : ''}{formatMinutes(record.balanceMinutes || 0)}
                    </td>
                    <td>
                      <span className={`badge ${record.status === 'PENDING' ? 'badge-warn' : record.status === 'ISSUE' ? 'badge-alert' : 'badge-active'}`}>
                        {record.status === 'PENDING' ? 'Pendente' : record.status === 'ISSUE' ? 'Incompleto' : 'Ok'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL AJUSTE MANUAL */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-gray-800">Ajuste Manual de Ponto</h3>
                <button onClick={() => setIsManualModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador</label>
                    <select 
                      required 
                      className="form-control w-full"
                      value={manualForm.employeeId}
                      onChange={e => setManualForm(prev => ({ ...prev, employeeId: e.target.value }))}
                    >
                      <option value="">Selecione...</option>
                      {employees.map((e: any) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input 
                      required 
                      type="date" 
                      className="form-control w-full"
                      value={manualForm.date}
                      onChange={e => setManualForm(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entrada 1</label>
                    <input 
                      type="time" 
                      className="form-control w-full"
                      value={manualForm.entry}
                      onChange={e => setManualForm(prev => ({ ...prev, entry: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Saída 1 (Almoço)</label>
                    <input 
                      type="time" 
                      className="form-control w-full"
                      value={manualForm.lunchStart}
                      onChange={e => setManualForm(prev => ({ ...prev, lunchStart: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entrada 2 (Retorno)</label>
                    <input 
                      type="time" 
                      className="form-control w-full"
                      value={manualForm.lunchReturn}
                      onChange={e => setManualForm(prev => ({ ...prev, lunchReturn: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Saída 2</label>
                    <input 
                      type="time" 
                      className="form-control w-full"
                      value={manualForm.exit}
                      onChange={e => setManualForm(prev => ({ ...prev, exit: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motivo Legal</label>
                    <select 
                      required 
                      className="form-control w-full"
                      value={manualForm.reason}
                      onChange={e => setManualForm(prev => ({ ...prev, reason: e.target.value as any }))}
                    >
                      <option value="ajuste_erro_marcacao">Erro de Marcação / Esquecimento</option>
                      <option value="ajuste_atestado_integral">Atestado Integral</option>
                      <option value="ajuste_abono_atestado_horas">Atestado Parcial (Horas)</option>
                      <option value="ajuste_feriado">Feriado Local</option>
                      <option value="ajuste_folga_dsr">Folga / DSR</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observação Interna</label>
                    <input 
                      type="text" 
                      className="form-control w-full"
                      value={manualForm.observation}
                      onChange={e => setManualForm(prev => ({ ...prev, observation: e.target.value }))}
                      placeholder="Ex: Acerto feito conforme solicitação do gestor"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <button type="button" className="btn-outline" onClick={() => setIsManualModalOpen(false)}>Cancelar</button>
                  <button type="submit" className="btn-nubank" disabled={manualAdjustMutation.loading}>
                    {manualAdjustMutation.loading ? 'Salvando...' : 'Confirmar Ajuste'}
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
