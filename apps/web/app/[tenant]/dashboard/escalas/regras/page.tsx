'use client';

import { Button } from '@/app/components/ui/button';

import { useState, useEffect } from 'react';
import { Settings, Clock, Calendar, Plus, Archive, Edit2, Play, X } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/platform-ui';
import { Modal, ConfirmDialog } from '../_components/operational-dialog';
import { PageHeader } from '@/app/components/ui/page-header';
import { toast } from 'sonner';

export default function RegrasPage() {
  const { user } = useAuth();
  const [decision, setDecision] = useState<{ type: 'archive' | 'holiday'; item: any } | null>(null);
  const isAuthorized = ['ADMIN', 'RH', 'DEV'].includes(String(user?.profile ?? user?.role ?? '').toUpperCase());
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
  const { data: rulesData, loading: loadingRules, refetch: refetchRules, error: rulesError } = useQuery(
    () => api.workScheduleRules.list(),
    [activeTab], { enabled: isAuthorized }
  );
  const rules = (rulesData || []) as any[];

  const { data: holidaysData, loading: loadingHolidays, refetch: refetchHolidays, error: holidaysError } = useQuery(
    () => activeTab === 'FERIADOS' ? api.companies.getHolidays() : Promise.resolve([]),
    [activeTab], { enabled: isAuthorized }
  );
  const holidays = (holidaysData || []) as any[];

  const activeRule = rules.find(rule => rule.status === 'ACTIVE');
  useEffect(() => {
    if (!activeRule) return;
    setExtrasForm({
      overtimeMultiplier: activeRule.normalOvertimePercent,
      holidayMultiplier: activeRule.holidayOvertimePercent,
      nightShiftMultiplier: activeRule.nightShiftPercent,
      timeBankEnabled: false,
      closingCycleStartDay: activeRule.closingStartDay,
      closingCycleEndDay: activeRule.closingEndDay,
    });
  }, [activeRule]);

  // Mutations
  const archiveMutation = useMutation((id: string) => api.workScheduleRules.archive(id), { onSuccess: () => refetchRules() });
  const activateMutation = useMutation((id: string) => api.workScheduleRules.activate(id), { onSuccess: () => refetchRules() });

  const createRuleMutation = useMutation(
    (data: any) => {
      const payload = { name: data.name.trim(), weeklyMinutes: Math.round(data.weeklyHours * 60), lateToleranceMinutes: data.toleranceMinutes, breakMinutes: data.intervalMinutes };
      return editingRule ? api.workScheduleRules.update(editingRule.id, payload) : api.workScheduleRules.create(payload);
    },
    {
      onSuccess: () => {
        setIsRuleModalOpen(false);
        setEditingRule(null);
        refetchRules();
      }
    }
  );

  const updateCompanyMutation = useMutation(
    (data: any) => {
      if (!activeRule) return Promise.reject(new Error('Cadastre e ative uma jornada antes de configurar os adicionais.'));
      return api.workScheduleRules.update(activeRule.id, {
        normalOvertimePercent: data.overtimeMultiplier, holidayOvertimePercent: data.holidayMultiplier,
        nightShiftPercent: data.nightShiftMultiplier, closingStartDay: data.closingCycleStartDay, closingEndDay: data.closingCycleEndDay,
      });
    },
    {
      onSuccess: () => {
        toast.success('Configurações da jornada salvas.');
        refetchRules();
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


  if (!isAuthorized) {
    return <ErrorState message="Acesso restrito a administradores e RH" />;
  }

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    void createRuleMutation.mutate(ruleForm).catch(() => {});
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingHoliday) {
      void updateHolidaysMutation.mutate(holidays.map(h => h.id === editingHoliday.id ? { ...h, ...holidayForm } : h)).catch(() => {});
    } else {
      const newHoliday = { ...holidayForm, id: Date.now().toString() };
      void updateHolidaysMutation.mutate([...holidays, newHoliday]).catch(() => {});
    }
  };

  const handleDeleteHoliday = (id: string) => {
    void updateHolidaysMutation.mutate(holidays.filter(h => h.id !== id)).then(() => setDecision(null)).catch(() => {});
  };

  const handleSaveExtras = (e: React.FormEvent) => {
    e.preventDefault();
    void updateCompanyMutation.mutate(extrasForm).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Regras" subtitle="Configure jornadas, adicionais, ciclo e feriados." actions={<>{activeTab !== 'EXTRAS' && (
          <Button variant="primary" type="button"
            className=" flex items-center gap-2"
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
            <Plus className="w-4 h-4" /> {activeTab === 'JORNADAS' ? 'Nova jornada' : 'Novo feriado'}
          </Button>
        )}</>} />
      {(rulesError || holidaysError) && <ErrorState message={rulesError || holidaysError || ''} retry={() => { refetchRules(); refetchHolidays(); }} />}
      {(archiveMutation.error || activateMutation.error || createRuleMutation.error || updateHolidaysMutation.error || updateCompanyMutation.error) && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{archiveMutation.error || activateMutation.error || createRuleMutation.error || updateHolidaysMutation.error || updateCompanyMutation.error}</p>}

      <div className="tab-bar">
        <Button variant="ghost" type="button" className={`tab-item ${activeTab === 'JORNADAS' ? 'tab-item-active' : ''}`} onClick={() => setActiveTab('JORNADAS')}>
          <Clock className="w-4 h-4 mr-2 inline" /> Jornadas
        </Button>
        <Button variant="ghost" type="button" className={`tab-item ${activeTab === 'EXTRAS' ? 'tab-item-active' : ''}`} onClick={() => setActiveTab('EXTRAS')}>
          <Settings className="w-4 h-4 mr-2 inline" /> Globais (Extras / Ciclo)
        </Button>
        <Button variant="ghost" type="button" className={`tab-item ${activeTab === 'FERIADOS' ? 'tab-item-active' : ''}`} onClick={() => setActiveTab('FERIADOS')}>
          <Calendar className="w-4 h-4 mr-2 inline" /> Feriados
        </Button>
      </div>

      {/* ABA JORNADAS */}
      {activeTab === 'JORNADAS' && (
        <div className="space-y-4">
          {loadingRules ? <LoadingState /> : rules.length > 0 ? rules.map((rule: any) => (
            <div key={rule.id} className="card-v2 p-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div>
                <h4 className="font-semibold text-gray-800">{rule.name}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Carga horária: {(rule.weeklyMinutes == null ? '--' : rule.weeklyMinutes / 60)}h/semana | Tolerância: {rule.lateToleranceMinutes ?? '--'} min | Intervalo: {rule.breakMinutes ?? '--'} min
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${rule.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                  {rule.status === 'ACTIVE' ? 'Ativo' : 'Arquivado'}
                </span>
                <Button aria-label="Editar" variant="ghost" type="button" className="" onClick={() => {
                  setEditingRule(rule);
                  setRuleForm({
                    name: rule.name,
                    weeklyHours: rule.weeklyMinutes / 60,
                    toleranceMinutes: rule.lateToleranceMinutes ?? 0,
                    intervalMinutes: rule.breakMinutes ?? 0
                  });
                  setIsRuleModalOpen(true);
                }}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                {rule.status === 'ACTIVE' ? (
                  <Button aria-label="Arquivar" variant="ghost" type="button" className=" text-gray-600 hover:text-red-500" disabled={archiveMutation.loading} onClick={() => setDecision({ type: 'archive', item: rule })}>
                    <Archive className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button aria-label="Ativar" variant="ghost" type="button" className=" text-green-600" disabled={activateMutation.loading} onClick={() => { void activateMutation.mutate(rule.id).catch(() => {}); }}>
                    <Play className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )) : <EmptyState title="Nenhuma jornada cadastrada" description="Crie jornadas para aplicar à sua equipe." />}
        </div>
      )}

      {/* ABA EXTRAS / GLOBAIS */}
      {activeTab === 'EXTRAS' && (
        <form onSubmit={handleSaveExtras} className="card-v2 p-4 p-6">
          <h3 className="section-title mb-3">Extras e ciclo</h3>
          <p className="mb-6 text-sm text-slate-600">{activeRule ? `Configurações da jornada ativa: ${activeRule.name}.` : 'Cadastre e ative uma jornada para carregar os parâmetros reais.'}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-b pb-2">Horas Extras</h4>
              <div>
                <label className="block text-sm font-medium mb-1">Hora Extra Dia Útil (%)</label>
                <input type="number" className="input-v2" value={extrasForm.overtimeMultiplier} onChange={e => setExtrasForm(p => ({...p, overtimeMultiplier: +e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora Extra DSR/Feriado (%)</label>
                <input type="number" className="input-v2" value={extrasForm.holidayMultiplier} onChange={e => setExtrasForm(p => ({...p, holidayMultiplier: +e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Adicional Noturno (%)</label>
                <input type="number" className="input-v2" value={extrasForm.nightShiftMultiplier} onChange={e => setExtrasForm(p => ({...p, nightShiftMultiplier: +e.target.value}))} />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 border-b pb-2">Banco de Horas & Ciclo</h4>
              <div className="pt-2 mb-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input type="checkbox" disabled aria-describedby="bank-unavailable" className="w-4 h-4 rounded text-[#8A05BE]" checked={extrasForm.timeBankEnabled} onChange={e => setExtrasForm(p => ({...p, timeBankEnabled: e.target.checked}))} />
                  <div>
                    <span className="text-sm font-medium block">Habilitar Banco de Horas</span>
                    <span className="text-xs text-gray-500"><span id="bank-unavailable">Alteração indisponível: não há campo de banco de horas neste contrato.</span></span>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Dia Inicial do Fechamento</label>
                  <input type="number" min="1" max="31" className="input-v2 w-full" value={extrasForm.closingCycleStartDay} onChange={e => setExtrasForm(p => ({...p, closingCycleStartDay: +e.target.value}))} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Dia Final</label>
                  <input type="number" min="1" max="31" className="input-v2 w-full" value={extrasForm.closingCycleEndDay} onChange={e => setExtrasForm(p => ({...p, closingCycleEndDay: +e.target.value}))} />
                </div>
              </div>
              <p className="text-xs text-gray-500 italic mt-1">Ex: do dia 21 ao dia 20 do mês seguinte.</p>
            </div>
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button variant="primary"
              type="submit"
              className={` ${updateCompanyMutation.loading ? 'opacity-50' : ''}`}
              disabled={updateCompanyMutation.loading || !activeRule || loadingRules}
            >
              {updateCompanyMutation.loading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </form>
      )}

      {/* ABA FERIADOS */}
      {activeTab === 'FERIADOS' && (
        <div className="space-y-4">
          {loadingHolidays ? <LoadingState /> : holidays.length > 0 ? holidays.map((holiday: any) => (
            <div key={holiday.id} className="card-v2 p-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div>
                <h4 className="font-semibold text-gray-800">{holiday.name}</h4>
                <p className="text-sm text-gray-500">{new Date(holiday.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="badge badge-brand">{holiday.type || 'Feriado'}</span>
                <span className="text-xs text-gray-500">{holiday.scope || 'Nacional'}</span>
                <Button aria-label="Editar" variant="ghost" type="button" className="" onClick={() => {
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
                </Button>
                <Button variant="ghost" type="button" className=" text-red-600 hover:text-red-800" aria-label={`Excluir feriado ${holiday.name}`} onClick={() => setDecision({ type: 'holiday', item: holiday })}>
                  <Archive className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )) : <EmptyState title="Nenhum feriado cadastrado" description="Cadastre os feriados que influenciam na folha da sua empresa." />}
        </div>
      )}

      <ConfirmDialog isOpen={!!decision} onClose={() => setDecision(null)} title={decision?.type === 'archive' ? 'Arquivar jornada' : 'Excluir feriado'} description={`Confirme a alteração de “${decision?.item.name ?? ''}”. O servidor aplicará os efeitos sobre jornadas e fechamentos.`} confirmText={decision?.type === 'archive' ? 'Arquivar jornada' : 'Excluir feriado'} isLoading={archiveMutation.loading || updateHolidaysMutation.loading} onConfirm={async () => {
        if (!decision) return;
        if (decision.type === 'archive') await archiveMutation.mutate(decision.item.id).then(() => setDecision(null)).catch(() => {});
        else handleDeleteHoliday(decision.item.id);
      }} />
      {/* MODAL NOVA JORNADA */}
      <Modal isOpen={isRuleModalOpen} onClose={() => { if (!createRuleMutation.loading) { setIsRuleModalOpen(false); setEditingRule(null); } }} title={editingRule ? 'Editar jornada' : 'Nova jornada'} maxWidth="max-w-xl">
<form onSubmit={handleCreateRule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Jornada</label>
                  <input aria-label="Ex: Comercial 44h"
                    required
                    type="text"
                    className="input-v2 w-full"
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
                      className="input-v2 w-full"
                      value={ruleForm.weeklyHours}
                      onChange={e => setRuleForm(prev => ({ ...prev, weeklyHours: +e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tolerância (minutos)</label>
                    <input
                      required
                      type="number"
                      className="input-v2 w-full"
                      value={ruleForm.toleranceMinutes}
                      onChange={e => setRuleForm(prev => ({ ...prev, toleranceMinutes: +e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo Padrão (minutos)</label>
                    <input
                      required
                      type="number"
                      className="input-v2 w-full"
                      value={ruleForm.intervalMinutes}
                      onChange={e => setRuleForm(prev => ({ ...prev, intervalMinutes: +e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Tempo de almoço deduzido da jornada diária.</p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <Button variant="outline" type="button" className="" onClick={() => { setIsRuleModalOpen(false); setEditingRule(null); }}>Cancelar</Button>
                  <Button variant="primary" type="submit" className="" disabled={createRuleMutation.loading}>
                    {createRuleMutation.loading ? 'Salvando...' : 'Salvar Regra'}
                  </Button>
                </div>
              </form>
</Modal>

      {/* MODAL NOVO FERIADO */}
      <Modal isOpen={isHolidayModalOpen} onClose={() => { if (!updateHolidaysMutation.loading) { setIsHolidayModalOpen(false); setEditingHoliday(null); } }} title={editingHoliday ? 'Editar feriado' : 'Novo feriado'} maxWidth="max-w-xl">
<form onSubmit={handleAddHoliday} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Feriado</label>
                  <input aria-label="Ex: Consciência Negra"
                    required
                    type="text"
                    className="input-v2 w-full"
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
                    className="input-v2 w-full"
                    value={holidayForm.date}
                    onChange={e => setHolidayForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="regras-field-427" className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select id="regras-field-427"
                      className="input-v2 w-full"
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
                    <input aria-label="Ex: Geral ou TI"
                      type="text"
                      className="input-v2 w-full"
                      placeholder="Ex: Geral ou TI"
                      value={holidayForm.scope}
                      onChange={e => setHolidayForm(prev => ({ ...prev, scope: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <Button variant="outline" type="button" className="" onClick={() => { setIsHolidayModalOpen(false); setEditingHoliday(null); }}>Cancelar</Button>
                  <Button variant="primary" type="submit" className="" disabled={updateHolidaysMutation.loading}>
                    {updateHolidaysMutation.loading ? 'Salvando...' : 'Salvar Feriado'}
                  </Button>
                </div>
              </form>
</Modal>
    </div>
  );
}
