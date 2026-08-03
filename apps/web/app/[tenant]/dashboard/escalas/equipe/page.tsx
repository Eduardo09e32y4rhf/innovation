'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/platform-ui';
import { Calendar, Users, Edit, Archive, Plus, ShieldAlert, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EquipeEscalasPage() {
  const { tenant } = useParams() as { tenant: string };
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // States
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7));
  
  // Modal States
  const [isNewScheduleModalOpen, setIsNewScheduleModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEmployeeForAssign, setSelectedEmployeeForAssign] = useState<any>(null);

  // Form States (New Schedule)
  const [newScheduleForm, setNewScheduleForm] = useState({
    name: '',
    description: '',
    workDays: [] as string[],
    entryTime: '',
    exitTime: ''
  });

  // Form States (Assign)
  const [assignForm, setAssignForm] = useState({
    scheduleId: '',
    startDate: '',
    endDate: ''
  });

  // Queries
  const { data: schedulesData, loading: isLoadingSchedules, error: errorSchedules } = useQuery(
    () => api.schedules.list(),
    ['schedules', tenant]
  );
  const schedules = (schedulesData || []) as any[];

  const { data: teamScheduleData, loading: isLoadingTeam, error: errorTeam } = useQuery(
    () => api.schedules.teamSchedule(currentMonth),
    ['teamSchedule', tenant, currentMonth]
  );
  const teamSchedule = (teamScheduleData || []) as any[];

  // Mutations
  const archiveMutation = useMutation(
    (id: string) => api.schedules.archive(id),
    { onSuccess: () => queryClient.invalidateQueries() }
  );

  const createScheduleMutation = useMutation(
    (data: any) => api.schedules.create(data),
    { 
      onSuccess: () => {
        queryClient.invalidateQueries();
        setIsNewScheduleModalOpen(false);
      }
    }
  );

  const assignMutation = useMutation(
    (data: any) => api.schedules.assign(data),
    { 
      onSuccess: () => {
        queryClient.invalidateQueries();
        setIsAssignModalOpen(false);
      }
    }
  );

  if (isLoadingSchedules || isLoadingTeam) return <LoadingState label="Carregando dados da equipe..." />;
  if (errorSchedules || errorTeam) return <ErrorState message="Erro ao carregar os dados" />;

  const filteredTeam = teamSchedule;

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    createScheduleMutation.mutate(newScheduleForm as any);
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    assignMutation.mutate({
      employeeId: selectedEmployeeForAssign?.id,
      ...assignForm
    } as any);
  };

  const toggleWorkDay = (day: string) => {
    setNewScheduleForm(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day) 
        ? prev.workDays.filter(d => d !== day) 
        : [...prev.workDays, day]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col md:flex-row justify-between md:items-center">
        <div>
          <h1 className="page-title">Equipe e Escalas</h1>
          <p className="page-subtitle">Gerencie os modelos de escala e atribuições da equipe</p>
        </div>
        <button 
          onClick={() => setIsNewScheduleModalOpen(true)}
          className="btn-nubank flex items-center gap-2 mt-4 md:mt-0"
        >
          <Plus size={18} />
          <span>Nova Escala</span>
        </button>
      </div>

      <section className="content-section">
        <h2 className="section-title mb-4">Modelos de Escala</h2>
        {schedules.length === 0 ? (
          <EmptyState title="Nenhuma escala" description="Crie seu primeiro modelo de escala clicando no botão acima." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((schedule: any) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={schedule.id} 
                className="card-flat flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{schedule.name}</h3>
                    <div className="flex gap-1">
                      <button className="btn-icon text-gray-500 hover:text-brand" title="Editar">
                        <Edit size={16} aria-hidden="true" />
                      </button>
                      <button 
                        className="btn-icon text-gray-500 hover:text-red-500" 
                        title="Arquivar"
                        onClick={() => archiveMutation.mutate(schedule.id)}
                      >
                        <Archive size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{schedule.description || 'Sem descrição'}</p>
                  
                  <div className="flex flex-col gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-brand" />
                      <span>{schedule.workDays?.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-brand" />
                      <span>{schedule.employeeCount || 0} funcionários</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="content-section">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
          <h2 className="section-title">Atribuições da Equipe</h2>
          <div className="flex gap-2 mt-2 md:mt-0">
            <input 
              type="month" 
              className="form-control max-w-[200px]" 
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
            />
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table w-full text-left">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Escala Atual</th>
                <th>Vigência</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeam.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">Nenhum registro encontrado.</td>
                </tr>
              ) : (
                filteredTeam.map((assignment: any) => (
                  <tr key={assignment.id || assignment.employee?.id}>
                    <td className="font-medium">{assignment.employee?.name}</td>
                    <td>{assignment.schedule?.name || <span className="italic text-gray-400">Sem escala</span>}</td>
                    <td className="text-sm text-gray-600">
                      {assignment.startDate ? new Date(assignment.startDate).toLocaleDateString() : '-'} 
                      {assignment.endDate ? ` a ${new Date(assignment.endDate).toLocaleDateString()}` : ' (Indeterminado)'}
                    </td>
                    <td>
                      <span className={`badge ${
                        assignment.status === 'ACTIVE' ? 'badge-active' : 
                        assignment.status === 'PENDING' ? 'badge-warn' : 'badge-inactive'
                      }`}>
                        {assignment.status === 'ACTIVE' ? 'Ativo' : assignment.status === 'PENDING' ? 'Pendente' : 'Expirado'}
                      </span>
                      {assignment.hasConflict && (
                        <span className="badge badge-alert ml-2 flex items-center gap-1 inline-flex">
                          <ShieldAlert size={12} /> Conflito
                        </span>
                      )}
                    </td>
                    <td>
                      <button 
                        onClick={() => {
                          setSelectedEmployeeForAssign(assignment.employee);
                          setIsAssignModalOpen(true);
                        }}
                        className="text-brand hover:underline text-sm font-medium"
                      >
                        Atribuir Escala
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL NOVA ESCALA */}
      <AnimatePresence>
        {isNewScheduleModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-gray-800">Nova Escala de Trabalho</h3>
                <button onClick={() => setIsNewScheduleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateSchedule} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Modelo</label>
                  <input 
                    required 
                    type="text" 
                    className="form-control w-full" 
                    placeholder="Ex: Comercial 5x2"
                    value={newScheduleForm.name}
                    onChange={e => setNewScheduleForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <input 
                    type="text" 
                    className="form-control w-full" 
                    placeholder="Breve descrição da jornada"
                    value={newScheduleForm.description}
                    onChange={e => setNewScheduleForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dias de Trabalho</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkDay(day)}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          newScheduleForm.workDays.includes(day) 
                            ? 'bg-brand text-white border-brand' 
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entrada</label>
                    <input 
                      required 
                      type="time" 
                      className="form-control w-full"
                      value={newScheduleForm.entryTime}
                      onChange={e => setNewScheduleForm(prev => ({ ...prev, entryTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Saída</label>
                    <input 
                      required 
                      type="time" 
                      className="form-control w-full"
                      value={newScheduleForm.exitTime}
                      onChange={e => setNewScheduleForm(prev => ({ ...prev, exitTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <button type="button" className="btn-outline" onClick={() => setIsNewScheduleModalOpen(false)}>Cancelar</button>
                  <button type="submit" className="btn-nubank" disabled={createScheduleMutation.loading}>
                    {createScheduleMutation.loading ? 'Salvando...' : 'Criar Escala'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL ATRIBUIÇÃO */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-gray-800">Atribuir Escala - {selectedEmployeeForAssign?.name}</h3>
                <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 bg-blue-50 border-b border-blue-100 text-sm text-blue-800 flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  <strong>Atenção:</strong> Atribuições com data inicial retroativa exigirão recálculo do banco de horas e ponto dos dias anteriores para o colaborador.
                </p>
              </div>

              <form onSubmit={handleAssign} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de Escala</label>
                  <select 
                    required 
                    className="form-control w-full"
                    value={assignForm.scheduleId}
                    onChange={e => setAssignForm(prev => ({ ...prev, scheduleId: e.target.value }))}
                  >
                    <option value="">Selecione uma escala...</option>
                    {schedules.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.workDays?.join(', ') || 'N/A'})</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Início da Vigência</label>
                    <input 
                      required 
                      type="date" 
                      className="form-control w-full"
                      value={assignForm.startDate}
                      onChange={e => setAssignForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fim (Opcional)</label>
                    <input 
                      type="date" 
                      className="form-control w-full"
                      value={assignForm.endDate}
                      onChange={e => setAssignForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <button type="button" className="btn-outline" onClick={() => setIsAssignModalOpen(false)}>Cancelar</button>
                  <button type="submit" className="btn-nubank" disabled={assignMutation.loading}>
                    {assignMutation.loading ? 'Processando...' : 'Confirmar Atribuição'}
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
