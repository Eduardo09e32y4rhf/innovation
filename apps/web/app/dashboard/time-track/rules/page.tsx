'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';

export default function WorkScheduleRulesPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const isRhOrAdmin = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    dailyMinutes: 480,
    weeklyMinutes: 2400,
    entryTime: '08:00',
    exitTime: '17:00',
    breakMinutes: 60,
    lateToleranceMinutes: 0,
    earlyLeaveToleranceMinutes: 0,
    overtimeToleranceMinutes: 0,
    overtimeEnabled: true,
    timeBankEnabled: false,
    normalOvertimePercent: 50,
    holidayOvertimePercent: 100,
    nightShiftEnabled: false,
    nightStartTime: '',
    nightEndTime: '',
    closingStartDay: 1,
    closingEndDay: 30,
    adjustmentDeadlineDay: 5,
    managerApprovalDeadlineDay: 10,
    department: '',
    position: '',
    workScale: '',
  });

  const listQuery = useQuery(() => api.workScheduleRules.list(), []);
  const rules = (listQuery.data ?? []) as any[];

  const saveMutation = useMutation((payload: any) => {
    if (editingId) return api.workScheduleRules.update(editingId, payload);
    return api.workScheduleRules.create(payload);
  }, {
    onSuccess: () => {
      setShowForm(false);
      setEditingId(null);
      resetForm();
      listQuery.refetch();
    },
  });

  const archiveMutation = useMutation((id: string) => api.workScheduleRules.archive(id), { onSuccess: () => listQuery.refetch() });
  const activateMutation = useMutation((id: string) => api.workScheduleRules.activate(id), { onSuccess: () => listQuery.refetch() });
  const deleteMutation = useMutation((id: string) => api.workScheduleRules.archive(id), { onSuccess: () => listQuery.refetch() });

  function resetForm() {
    setForm({
      name: '',
      description: '',
      dailyMinutes: 480,
      weeklyMinutes: 2400,
      entryTime: '08:00',
      exitTime: '17:00',
      breakMinutes: 60,
      lateToleranceMinutes: 0,
      earlyLeaveToleranceMinutes: 0,
      overtimeToleranceMinutes: 0,
      overtimeEnabled: true,
      timeBankEnabled: false,
      normalOvertimePercent: 50,
      holidayOvertimePercent: 100,
      nightShiftEnabled: false,
      nightStartTime: '',
      nightEndTime: '',
      closingStartDay: 1,
      closingEndDay: 30,
      adjustmentDeadlineDay: 5,
      managerApprovalDeadlineDay: 10,
      department: '',
      position: '',
      workScale: '',
    });
  }

  function handleEdit(rule: any) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      description: rule.description ?? '',
      dailyMinutes: rule.dailyMinutes,
      weeklyMinutes: rule.weeklyMinutes,
      entryTime: rule.entryTime ?? '08:00',
      exitTime: rule.exitTime ?? '17:00',
      breakMinutes: rule.breakMinutes,
      lateToleranceMinutes: rule.lateToleranceMinutes,
      earlyLeaveToleranceMinutes: rule.earlyLeaveToleranceMinutes,
      overtimeToleranceMinutes: rule.overtimeToleranceMinutes,
      overtimeEnabled: rule.overtimeEnabled,
      timeBankEnabled: rule.timeBankEnabled,
      normalOvertimePercent: rule.normalOvertimePercent,
      holidayOvertimePercent: rule.holidayOvertimePercent,
      nightShiftEnabled: rule.nightShiftEnabled,
      nightStartTime: rule.nightStartTime ?? '',
      nightEndTime: rule.nightEndTime ?? '',
      closingStartDay: rule.closingStartDay,
      closingEndDay: rule.closingEndDay,
      adjustmentDeadlineDay: rule.adjustmentDeadlineDay,
      managerApprovalDeadlineDay: rule.managerApprovalDeadlineDay,
      department: rule.department ?? '',
      position: rule.position ?? '',
      workScale: rule.workScale ?? '',
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isRhOrAdmin) return;
    const payload = {
      ...form,
      dailyMinutes: Number(form.dailyMinutes),
      weeklyMinutes: Number(form.weeklyMinutes),
      breakMinutes: Number(form.breakMinutes),
      lateToleranceMinutes: Number(form.lateToleranceMinutes),
      earlyLeaveToleranceMinutes: Number(form.earlyLeaveToleranceMinutes),
      overtimeToleranceMinutes: Number(form.overtimeToleranceMinutes),
      normalOvertimePercent: Number(form.normalOvertimePercent),
      holidayOvertimePercent: Number(form.holidayOvertimePercent),
      closingStartDay: Number(form.closingStartDay),
      closingEndDay: Number(form.closingEndDay),
      adjustmentDeadlineDay: Number(form.adjustmentDeadlineDay),
      managerApprovalDeadlineDay: Number(form.managerApprovalDeadlineDay),
    };
    saveMutation.mutate(payload);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">CONFIGURAÇÕES</p>
          <h2 className="text-2xl font-black text-slate-950">Regras de Jornada e Fechamento</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Defina jornadas, tolerâncias, intervalos, adicional noturno e período de fechamento da folha.</p>
        </div>
        {isRhOrAdmin && (
          <button type="button" onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] bg-gradient-to-r from-teal-500 to-cyan-600 px-4 text-xs font-black text-white shadow-lg shadow-teal-500/25">
            <Plus size={14} />
            Nova regra
          </button>
        )}
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nome da regra" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Descrição" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
            <Field label="Departamento (opcional)" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
            <Field label="Cargo (opcional)" value={form.position} onChange={(v) => setForm({ ...form, position: v })} />
            <Field label="Escala (opcional)" value={form.workScale} onChange={(v) => setForm({ ...form, workScale: v })} />
            <Field label="Jornada diária (minutos)" type="number" value={String(form.dailyMinutes)} onChange={(v) => setForm({ ...form, dailyMinutes: Number(v) })} />
            <Field label="Jornada semanal (minutos)" type="number" value={String(form.weeklyMinutes)} onChange={(v) => setForm({ ...form, weeklyMinutes: Number(v) })} />
            <Field label="Horário entrada" type="time" value={form.entryTime} onChange={(v) => setForm({ ...form, entryTime: v })} />
            <Field label="Horário saída" type="time" value={form.exitTime} onChange={(v) => setForm({ ...form, exitTime: v })} />
            <Field label="Intervalo (minutos)" type="number" value={String(form.breakMinutes)} onChange={(v) => setForm({ ...form, breakMinutes: Number(v) })} />
            <Field label="Tolerância atraso (min)" type="number" value={String(form.lateToleranceMinutes)} onChange={(v) => setForm({ ...form, lateToleranceMinutes: Number(v) })} />
            <Field label="Tolerância saída antec. (min)" type="number" value={String(form.earlyLeaveToleranceMinutes)} onChange={(v) => setForm({ ...form, earlyLeaveToleranceMinutes: Number(v) })} />
            <Field label="Tolerância hora extra (min)" type="number" value={String(form.overtimeToleranceMinutes)} onChange={(v) => setForm({ ...form, overtimeToleranceMinutes: Number(v) })} />
            <Field label="HE normal (%)" type="number" value={String(form.normalOvertimePercent)} onChange={(v) => setForm({ ...form, normalOvertimePercent: Number(v) })} />
            <Field label="HE domingo/feriado (%)" type="number" value={String(form.holidayOvertimePercent)} onChange={(v) => setForm({ ...form, holidayOvertimePercent: Number(v) })} />
            <Field label="Início adicional noturno" type="time" value={form.nightStartTime} onChange={(v) => setForm({ ...form, nightStartTime: v })} />
            <Field label="Fim adicional noturno" type="time" value={form.nightEndTime} onChange={(v) => setForm({ ...form, nightEndTime: v })} />
            <Field label="Fechamento - dia início" type="number" value={String(form.closingStartDay)} onChange={(v) => setForm({ ...form, closingStartDay: Number(v) })} />
            <Field label="Fechamento - dia fim" type="number" value={String(form.closingEndDay)} onChange={(v) => setForm({ ...form, closingEndDay: Number(v) })} />
            <Field label="Prazo ajuste colaborador (dia)" type="number" value={String(form.adjustmentDeadlineDay)} onChange={(v) => setForm({ ...form, adjustmentDeadlineDay: Number(v) })} />
            <Field label="Prazo aprovação gestor (dia)" type="number" value={String(form.managerApprovalDeadlineDay)} onChange={(v) => setForm({ ...form, managerApprovalDeadlineDay: Number(v) })} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Toggle label="Permite hora extra?" checked={form.overtimeEnabled} onChange={(v) => setForm({ ...form, overtimeEnabled: v })} />
            <Toggle label="Permite banco de horas?" checked={form.timeBankEnabled} onChange={(v) => setForm({ ...form, timeBankEnabled: v })} />
            <Toggle label="Adicional noturno?" checked={form.nightShiftEnabled} onChange={(v) => setForm({ ...form, nightShiftEnabled: v })} />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">CANCELAR</button>
            <button type="submit" disabled={saveMutation.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">
              {saveMutation.loading ? 'SALVANDO...' : editingId ? 'ATUALIZAR' : 'CRIAR REGRA'}
            </button>
          </div>
        </form>
      )}

      {listQuery.loading && <LoadingState label="Carregando regras..." />}
      {listQuery.error && <ErrorState message={listQuery.error} onRetry={listQuery.refetch} />}
      {!listQuery.loading && !listQuery.error && rules.length === 0 && (
        <EmptyState message="Nenhuma regra criada." />
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-slate-950">{rule.name}</h3>
                  <span className={`inline-flex rounded-[5px] border px-2 py-0.5 text-[9px] font-black ${rule.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                    {rule.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-600">Jornada: {rule.dailyMinutes / 60}h | Fechamento: {rule.closingStartDay} a {rule.closingEndDay}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">Entrada: {rule.entryTime ?? '--:--'} | Saída: {rule.exitTime ?? '--:--'} | Intervalo: {rule.breakMinutes}min</p>
              </div>
              <div className="flex gap-1.5">
                {isRhOrAdmin && (
                  <>
                    <button type="button" onClick={() => handleEdit(rule)} className="btn-outline-premium h-8 px-2.5 text-[10px] font-black"><Pencil size={12} /></button>
                    {rule.status === 'ACTIVE' ? (
                      <button type="button" onClick={() => archiveMutation.mutate(rule.id)} className="btn-outline h-8 px-2.5 text-[10px] font-black"><Archive size={12} /></button>
                    ) : (
                      <button type="button" onClick={() => activateMutation.mutate(rule.id)} className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-gradient-to-r from-emerald-500 to-teal-600 px-2.5 text-[10px] font-black text-white"><RotateCcw size={12} /></button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-600">
      <span>{label} {required && <span className="text-rose-500">*</span>}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded-[4px] border-slate-300 text-teal-600 focus:ring-teal-500" />
      {label}
    </label>
  );
}