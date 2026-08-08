'use client';

import { useState, useEffect } from 'react';
import { Settings, Clock, Calendar, Plus, Archive, Edit2, Play, X } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/platform-ui';
import { motion, AnimatePresence } from 'framer-motion';

export default function RegrasPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('JORNADAS');

  // Modals
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);

  // Forms
  const [ruleForm, setRuleForm] = useState({
    name: '',
    weeklyHours: 44,
    toleranceMinutes: 10,
    intervalMinutes: 60
  });

  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    type: 'NACIONAL',
    scope: 'Geral'
  });

  const [extrasForm, setExtrasForm] = useState({
    overtimeMultiplier: 50,
    holidayMultiplier: 100,
    nightShiftMultiplier: 20,
    timeBankEnabled: true,
    closingCycleStartDay: 1,
    closingCycleEndDay: 30
  });

  // Queries
  const { data: rulesData, loading: loadingRules, refetch: refetchRules } = useQuery(
    () => activeTab === 'JORNADAS' ? api.workScheduleRules.list() : Promise.resolve([]),
    [activeTab]
  );
  const rules = (rulesData || []) as any[];

  const { data: holidaysData, loading: loadingHolidays, refetch: refetchHolidays } = useQuery(
    () => activeTab === 'FERIADOS' ? api.companies.getHolidays() : Promise.resolve([]),
    [activeTab]
  );
  const holidays = (holidaysData || []) as any[];

  const { data: companyData, loading: loadingCompany } = useQuery(
    () => activeTab === 'EXTRAS' ? api.companies.me() : Promise.resolve(null),
    [activeTab]
  );

  // Load existing company settings into form
  useEffect(() => {
    if (companyData) {
      setExtrasForm(prev => ({
        ...prev,
        // Mocking reading these from companyData since they might be in a JSON metadata field in the real DB
        ...((companyData as any).settings || {})
      }));
    }
  }, [companyData]);

  // Mutations
  const archiveMutation = useMutation((id: string) => api.workScheduleRules.archive(id), { onSuccess: () => refetchRules() });
  const activateMutation = useMutation((id: string) => api.workScheduleRules.activate(id), { onSuccess: () => refetchRules() });
  
  const createRuleMutation = useMutation(
    (data: any) => editingRule ? api.workScheduleRules.update(editingRule.id, data) : api.workScheduleRules.create(data),
    {
      onSuccess: () => {
        setIsRuleModalOpen(false);
        setEditingRule(null);
        refetchRules();
      }
    }
  );

  const updateCompanyMutation = useMutation(
    (data: any) => api.companies.update({ settings: data } as any),
    {
      onSuccess: () => {
        alert('Configurações salvas com sucesso!');
      }
    }
  );

  const updateHolidaysMutation = useMutation(
    (newHolidays: any[]) => api.companies.updateHolidays(newHolidays),
    {
      onSuccess: () => {
        setIsHolidayModalOpen(false);
        refetchHolidays();
      }
    }
  );

  const isAuthorized = ['ADMIN', 'RH', 'DEV'].includes(user?.role || '');

  if (!isAuthorized) {
    return <ErrorState message="Acesso restrito a administradores e RH" />;
  }

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    createRuleMutation.mutate(ruleForm);
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingHoliday) {
      updateHolidaysMutation.mutate(holidays.map(h => h.id === editingHoliday.id ? { ...holidayForm, id: h.id } : h));
    } else {
      const newHoliday = { ...holidayForm, id: Date.now().toString() };
      updateHolidaysMutation.mutate([...holidays, newHoliday]);
    }
  };

  const handleDeleteHoliday = (id: string) => {
    updateHolidaysMutation.mutate(holidays.filter(h => h.id !== id));
  };

  const handleSaveExtras = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyMutation.mutate(extrasForm);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="page-title">Regras e Configurações</h1>
          <p className="page-subtitle">Configure jornadas, banco de horas, ciclos e feriados</p>
        </div>
        {activeTab !== 'EXTRAS' && (
          <button 
            className="btn-nubank flex items-center gap-2"
            onClick={() => {
              if (activeTab === 'JORNADAS') {
                setEditingRule(null);
                setRuleForm({ name: '', weeklyHours: 44, toleranceMinutes: 10, intervalMinutes: 60 });
                setIsRuleModalOpen(true);
              } else {
                setEditingHoliday(null);
                setHolidayForm({ name: '', date: '', type: 'NACIONAL', scope: 'Geral' });
                setIsHolidayModalOpen(true);
              }
            }}
          >
            <Plus className="w-4 h-4" /> Novo
          </button>
        )}
      </div>

      <div className="tab-bar">
        <button className={`tab-item ${activeTab === 'JORNADAS' ? 'tab-item-active' : ''}`} onClick={() => setActiveTab('JORNADAS')}>
          <Clock className="w-4 h-4 mr-2 inline" /> Jornadas
        </button>
        <button className={`tab-item ${activeTab === 'EXTRAS' ? 'tab-item-active' : ''}`} onClick={() => setActiveTab('EXTRAS')}>
          <Settings className="w-4 h-4 mr-2 inline" /> Globais (Extras / Ciclo)
        </button>
        <button className={`tab-item ${activeTab === 'FERIADOS' ? 'tab-item-active' : ''}`} onClick={() => setActiveTab('FERIADOS')}>
          <Calendar className="w-4 h-4 mr-2 inline" /> Feriados
        </button>
      </div>

      {/* ABA JORNADAS */}
      {activeTab === 'JORNADAS' && (
        <div className="space-y-4">
          {loadingRules ? <LoadingState /> : rules.length > 0 ? rules.map((rule: any) => (
            <div key={rule.id} className="card-flat p-4 flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-gray-800">{rule.name}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Carga horária: {rule.weeklyHours || '--'}h/semana | Tolerância: {rule.toleranceMinutes || '--'} min | Intervalo: {rule.intervalMinutes || '--'} min
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${rule.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                  {rule.status === 'ACTIVE' ? 'Ativo' : 'Arquivado'}
                </span>
                <button className="btn-icon" onClick={() => {
                  setEditingRule(rule);
                  setRuleForm({
                    name: rule.name,
                    weeklyHours: rule.weeklyHours || 44,
                    toleranceMinutes: rule.toleranceMinutes || 10,
                    intervalMinutes: rule.intervalMinutes || 60
                  });
                  setIsRuleModalOpen(true);
                }}>
                  <Edit2 className="w-4 h-4" />
                </button>
                {rule.status === 'ACTIVE' ? (
                  <button className="btn-icon text-gray-600 hover:text-red-500" onClick={() => archiveMutation.mutate(rule.id)}>
                    <Archive className="w-4 h-4" />
                  </button>
                ) : (
                  <button className="btn-icon text-green-600" onClick={() => activateMutation.mutate(rule.id)}>
                    <Play className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )) : <EmptyState title="Nenhuma jornada cadastrada" description="Crie jornadas para aplicar à sua equipe." />}
        </div>
      )}

      {/* ABA EXTRAS / GLOBAIS */}
      {activeTab === 'EXTRAS' && (
        <form onSubmit={handleSaveExtras} className="card-flat p-6">
          <h3 className="section-title mb-6">Configurações Gerais de Folha</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-b pb-2">Horas Extras</h4>
              <div>
                <label className="block text-sm font-medium mb-1">Hora Extra Dia Útil (%)</label>
                <input type="number" className="form-control" value={extrasForm.overtimeMultiplier} onChange={e => setExtrasForm(p => ({...p, overtimeMultiplier: +e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora Extra DSR/Feriado (%)</label>
                <input type="number" className="form-control" value={extrasForm.holidayMultiplier} onChange={e => setExtrasForm(p => ({...p, holidayMultiplier: +e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Adicional Noturno (%)</label>
                <input type="number" className="form-control" value={extrasForm.nightShiftMultiplier} onChange={e => setExtrasForm(p => ({...p, nightShiftMultiplier: +e.target.value}))} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-b pb-2">Banco de Horas & Ciclo</h4>
              <div className="pt-2 mb-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input type="checkbox" className="w-4 h-4 rounded text-[#8A05BE]" checked={extrasForm.timeBankEnabled} onChange={e => setExtrasForm(p => ({...p, timeBankEnabled: e.target.checked}))} />
                  <div>
                    <span className="text-sm font-medium block">Habilitar Banco de Horas</span>
                    <span className="text-xs text-gray-500">Compensação de horas permitida</span>
                  </div>
                </label>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Dia Inicial do Fechamento</label>
                  <input type="number" min="1" max="31" className="form-control w-full" value={extrasForm.closingCycleStartDay} onChange={e => setExtrasForm(p => ({...p, closingCycleStartDay: +e.target.value}))} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Dia Final</label>
                  <input type="number" min="1" max="31" className="form-control w-full" value={extrasForm.closingCycleEndDay} onChange={e => setExtrasForm(p => ({...p, closingCycleEndDay: +e.target.value}))} />
                </div>
              </div>
              <p className="text-xs text-gray-500 italic mt-1">Ex: do dia 21 ao dia 20 do mês seguinte.</p>
            </div>
          </div>
          
          <div className="flex justify-end border-t pt-4">
            <button 
              type="submit" 
              className={`btn-nubank ${updateCompanyMutation.loading ? 'opacity-50' : ''}`}
              disabled={updateCompanyMutation.loading}
            >
              {updateCompanyMutation.loading ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      )}

      {/* ABA FERIADOS */}
      {activeTab === 'FERIADOS' && (
        <div className="space-y-4">
          {loadingHolidays ? <LoadingState /> : holidays.length > 0 ? holidays.map((holiday: any) => (
            <div key={holiday.id} className="card-flat p-4 flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-gray-800">{holiday.name}</h4>
                <p className="text-sm text-gray-500">{new Date(holiday.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="badge badge-brand">{holiday.type || 'Feriado'}</span>
                <span className="text-xs text-gray-500">{holiday.scope || 'Nacional'}</span>
                <button className="btn-icon" onClick={() => {
                  setEditingHoliday(holiday);
                  setHolidayForm({
                    name: holiday.name,
                    date: holiday.date ? holiday.date.split('T')[0] : '',
                    type: holiday.type || 'NACIONAL',
                    scope: holiday.scope || 'Geral'
                  });
                  setIsHolidayModalOpen(true);
                }}>
                  <Edit2 className="w-4 h-4" />
                </button>
                <button className="btn-icon text-red-600 hover:text-red-800" onClick={() => handleDeleteHoliday(holiday.id)}>
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>
          )) : <EmptyState title="Nenhum feriado cadastrado" description="Cadastre os feriados que influenciam na folha da sua empresa." />}
        </div>
      )}

      {/* MODAL NOVA JORNADA */}
      <AnimatePresence>
        {isRuleModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-gray-800">{editingRule ? 'Editar Regra' : 'Nova Regra de Jornada'}</h3>
                <button onClick={() => { setIsRuleModalOpen(false); setEditingRule(null); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateRule} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Jornada</label>
                  <input 
                    required 
                    type="text" 
                    className="form-control w-full"
                    placeholder="Ex: Comercial 44h"
                    value={ruleForm.name}
                    onChange={e => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Carga Horária Semanal</label>
                    <input 
                      required 
                      type="number" 
                      className="form-control w-full"
                      value={ruleForm.weeklyHours}
                      onChange={e => setRuleForm(prev => ({ ...prev, weeklyHours: +e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tolerância (minutos)</label>
                    <input 
                      required 
                      type="number" 
                      className="form-control w-full"
                      value={ruleForm.toleranceMinutes}
                      onChange={e => setRuleForm(prev => ({ ...prev, toleranceMinutes: +e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo Padrão (minutos)</label>
                    <input 
                      required 
                      type="number" 
                      className="form-control w-full"
                      value={ruleForm.intervalMinutes}
                      onChange={e => setRuleForm(prev => ({ ...prev, intervalMinutes: +e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Tempo de almoço deduzido da jornada diária.</p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <button type="button" className="btn-outline" onClick={() => { setIsRuleModalOpen(false); setEditingRule(null); }}>Cancelar</button>
                  <button type="submit" className="btn-nubank" disabled={createRuleMutation.loading}>
                    {createRuleMutation.loading ? 'Salvando...' : 'Salvar Regra'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL NOVO FERIADO */}
      <AnimatePresence>
        {isHolidayModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-gray-800">{editingHoliday ? 'Editar Feriado' : 'Cadastrar Feriado'}</h3>
                <button onClick={() => { setIsHolidayModalOpen(false); setEditingHoliday(null); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddHoliday} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Feriado</label>
                  <input 
                    required 
                    type="text" 
                    className="form-control w-full"
                    placeholder="Ex: Consciência Negra"
                    value={holidayForm.name}
                    onChange={e => setHolidayForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input 
                    required 
                    type="date" 
                    className="form-control w-full"
                    value={holidayForm.date}
                    onChange={e => setHolidayForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select 
                      className="form-control w-full"
                      value={holidayForm.type}
                      onChange={e => setHolidayForm(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="NACIONAL">Nacional</option>
                      <option value="ESTADUAL">Estadual</option>
                      <option value="MUNICIPAL">Municipal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Escopo</label>
                    <input 
                      type="text" 
                      className="form-control w-full"
                      placeholder="Ex: Geral ou TI"
                      value={holidayForm.scope}
                      onChange={e => setHolidayForm(prev => ({ ...prev, scope: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <button type="button" className="btn-outline" onClick={() => { setIsHolidayModalOpen(false); setEditingHoliday(null); }}>Cancelar</button>
                  <button type="submit" className="btn-nubank" disabled={updateHolidaysMutation.loading}>
                    {updateHolidaysMutation.loading ? 'Salvando...' : 'Salvar Feriado'}
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
