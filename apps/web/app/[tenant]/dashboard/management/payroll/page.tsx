'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { managementDocumentsApi } from '../management-documents-api';
import { FileText, MessageSquare, Send, Check, Zap, RefreshCcw, XCircle, X, FileCheck2 } from 'lucide-react';
import { LoadingState, ErrorState } from '@/app/components/data-states';

export default function PayrollPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canManage = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';

  if (!canManage) {
    return (
      <div className="surface p-12 text-center text-slate-500">
        Você não tem permissão para acessar esta área.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <RulesTab canManage={canManage} />
      <ClosingTab canManage={canManage} />
    </div>
  );
}

function RulesTab({ canManage }: { canManage: boolean }) {
  const [formOpen, setFormOpen] = useState<{ open: boolean; rule: any | null }>({ open: false, rule: null });
  
  const rulesQuery = useQuery(() => api.workScheduleRules.list(), []);
  const companyQuery = useQuery(() => api.companies.me(), []);
  const holidaysQuery = useQuery(() => api.companies.getHolidays(), []);

  const saveMut = useMutation(({ data, id }: { data: any, id?: string }) => id ? api.workScheduleRules.update(id, data) : api.workScheduleRules.create(data), { onSuccess: () => rulesQuery.refetch() });
  const archiveMut = useMutation((id: string) => api.workScheduleRules.archive(id), { onSuccess: () => rulesQuery.refetch() });
  const activateMut = useMutation((id: string) => api.workScheduleRules.activate(id), { onSuccess: () => rulesQuery.refetch() });
  
  const updateCompanyMut = useMutation((data: any) => api.companies.update(data as any), { onSuccess: () => companyQuery.refetch() });
  const updateHolidaysMut = useMutation((data: any[]) => api.companies.updateHolidays(data), { onSuccess: () => holidaysQuery.refetch() });


  const rules = (rulesQuery.data as any[] | undefined) ?? [];
  const company = companyQuery.data;
  const holidays = (holidaysQuery.data as any[] | undefined) ?? [];

  if (rulesQuery.loading && !rulesQuery.data) return <LoadingState label="Carregando regras..." />;
  if (rulesQuery.error && !rulesQuery.data) return <ErrorState message={rulesQuery.error} onRetry={rulesQuery.refetch} />;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-950">REGRAS DE JORNADA E PONTO</h3>
          <p className="mt-1 text-xs text-slate-500">Defina as regras aplicadas aos funcionários para cálculo da folha.</p>
        </div>
        {canManage && !formOpen.open && (
          <button onClick={() => setFormOpen({ open: true, rule: null })} className="btn-primary inline-flex h-9 items-center gap-2 px-4 text-xs">
            + NOVA REGRA
          </button>
        )}
      </div>

      {formOpen.open ? (
        <RuleForm rule={formOpen.rule} onSave={async (data, id) => { await saveMut.mutate({ data, id }); setFormOpen({ open: false, rule: null }); }} onClose={() => setFormOpen({ open: false, rule: null })} saving={saveMut.loading} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((r: any) => (
            <div key={r.id} className={`surface flex flex-col justify-between p-4 ${r.status === 'ACTIVE' ? '' : 'opacity-70 grayscale'}`}>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-slate-950">{r.name ?? 'Regra sem nome'}</p>
                    {r.description && <p className="mt-0.5 text-[11px] text-slate-500">{r.description}</p>}
                  </div>
                  <span className={`inline-flex rounded-[5px] border px-1.5 py-0.5 text-[9px] font-black ${r.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {r.status === 'ACTIVE' ? 'ATIVA' : 'INATIVA'}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-[11px] font-semibold text-slate-600">
                  <p>Jornada: {r.workdayHours ?? r.weeklyWorkload ?? '---'}h/semana</p>
                  <p>Entrada: {r.standardEntry ?? '---'} | Saída: {r.standardExit ?? '---'}</p>
                  <p>Tolerância: {r.toleranceMinutes ?? 0} min | Intervalo: {r.lunchBreakMinutes ?? 0} min</p>
                  {r.overtimeRule && <p>HE: {r.overtimeRule}</p>}
                  {r.nightShiftExtra !== undefined && <p>Adicional noturno: {r.nightShiftExtra}%</p>}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setFormOpen({ open: true, rule: r })} className="btn-outline h-7 px-2 text-[10px] font-bold">Editar</button>
                {canManage && (
                  r.status === 'ACTIVE'
                    ? <button onClick={() => archiveMut.mutate(r.id).catch(() => {})} className="btn-danger h-7 px-2 text-[10px]">Inativar</button>
                    : <button onClick={() => activateMut.mutate(r.id).catch(() => {})} className="btn-primary h-7 px-2 text-[10px]">Ativar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-6 border-t border-slate-100">
        <h3 className="text-sm font-black text-slate-950 mb-4">CONFIGURAÇÕES GERAIS E FERIADOS</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="surface p-5 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase">Ciclo de Fechamento</h4>
              <p className="text-[10px] text-slate-500 mb-4 mt-1">Qual dia do mês inicia a contagem da folha de ponto?</p>
              <div className="flex items-center gap-3">
                <input type="number" min="1" max="31" defaultValue={(company as any)?.payrollStartDay || 1} onBlur={(e) => {
                  if (!canManage) return;
                  updateCompanyMut.mutate({ payrollStartDay: parseInt(e.target.value) || 1 });
                }} disabled={!canManage || updateCompanyMut.loading} className="form-control w-24 text-center font-bold" />
                <span className="text-xs text-slate-600 font-semibold">Ex: "1" (mês cheio) ou "15"</span>
              </div>
            </div>
            {updateCompanyMut.loading && <p className="text-[10px] text-[var(--color-brand)] mt-2 font-bold animate-pulse">Salvando...</p>}
          </div>

          <div className="surface p-5 flex flex-col h-64">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-black text-slate-900 uppercase">Feriados Personalizados</h4>
              <span className="text-[10px] font-bold text-teal-600">{holidays.length} cadastrados</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {holidays.length === 0 ? <p className="text-[10px] text-slate-400 italic text-center py-4">Nenhum feriado cadastrado.</p> : holidays.map((h, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-700 w-20">{new Date(h.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    <span className="text-[10px] font-bold text-slate-900 truncate max-w-[120px]">{h.name}</span>
                  </div>
                  {canManage && <button onClick={() => updateHolidaysMut.mutate(holidays.filter((_, idx) => idx !== i))} className="text-[10px] text-rose-500 font-bold hover:underline">Remover</button>}
                </div>
              ))}
            </div>
            {canManage && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const date = fd.get('date') as string;
                const name = fd.get('name') as string;
                if (!date || !name) return;
                updateHolidaysMut.mutate([...holidays, { date, name, type: 'NACIONAL' }]);
                e.currentTarget.reset();
              }} className="flex gap-2">
                <input type="date" name="date" required className="form-control h-8 text-[10px] flex-1 !py-0" />
                <input type="text" name="name" placeholder="Nome do Feriado" required className="form-control h-8 text-[10px] flex-1 !py-0" />
                <button type="submit" disabled={updateHolidaysMut.loading} className="btn-primary h-8 px-3 text-[10px] !py-0 w-auto">+</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function RuleForm({ rule, onSave, onClose, saving }: { rule: any | null; onSave: (data: any, id?: string) => Promise<any>; onClose: () => void; saving: boolean }) {
  const [name, setName] = useState(rule?.name ?? '');
  const [description, setDescription] = useState(rule?.description ?? '');
  const [standardEntry, setStandardEntry] = useState(rule?.standardEntry ?? '08:00');
  const [standardExit, setStandardExit] = useState(rule?.standardExit ?? '18:00');
  const [toleranceMinutes, setToleranceMinutes] = useState(rule?.toleranceMinutes ?? 10);
  const [lunchBreakMinutes, setLunchBreakMinutes] = useState(rule?.lunchBreakMinutes ?? 60);
  const [weeklyWorkload, setWeeklyWorkload] = useState(rule?.weeklyWorkload ?? 44);
  const [overtimeRule, setOvertimeRule] = useState(rule?.overtimeRule ?? '50%');
  const [nightShiftExtra, setNightShiftExtra] = useState(rule?.nightShiftExtra ?? 20);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Nome é obrigatório'); return; }
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        standardEntry,
        standardExit,
        toleranceMinutes: Number(toleranceMinutes),
        lunchBreakMinutes: Number(lunchBreakMinutes),
        weeklyWorkload: Number(weeklyWorkload),
        overtimeRule,
        nightShiftExtra: Number(nightShiftExtra),
      }, rule?.id);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao salvar');
    }
  };

  return (
    <div className="surface p-5">
      <h4 className="mb-4 text-xs font-black text-slate-950 uppercase">{rule ? 'EDITAR REGRA' : 'NOVA REGRA'}</h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="form-group sm:col-span-3"><span>NOME</span><input value={name} onChange={e => setName(e.target.value)} className="form-control" /></label>
        <label className="form-group sm:col-span-3"><span>DESCRIÇÃO</span><input value={description} onChange={e => setDescription(e.target.value)} className="form-control" /></label>
        <label className="form-group"><span>ENTRADA PADRÃO</span><input type="time" value={standardEntry} onChange={e => setStandardEntry(e.target.value)} className="form-control" /></label>
        <label className="form-group"><span>SAÍDA PADRÃO</span><input type="time" value={standardExit} onChange={e => setStandardExit(e.target.value)} className="form-control" /></label>
        <label className="form-group"><span>CARGA SEMANAL (h)</span><input type="number" value={weeklyWorkload} onChange={e => setWeeklyWorkload(Number(e.target.value))} className="form-control" /></label>
        <label className="form-group"><span>TOLERÂNCIA (min)</span><input type="number" value={toleranceMinutes} onChange={e => setToleranceMinutes(Number(e.target.value))} className="form-control" /></label>
        <label className="form-group"><span>INTERVALO (min)</span><input type="number" value={lunchBreakMinutes} onChange={e => setLunchBreakMinutes(Number(e.target.value))} className="form-control" /></label>
        <label className="form-group"><span>REGRA H.E.</span>
          <select value={overtimeRule} onChange={e => setOvertimeRule(e.target.value)} className="form-control">
            <option value="50%">50%</option>
            <option value="100%">100%</option>
            <option value="50%+100%">50% + 100%</option>
          </select>
        </label>
        <label className="form-group"><span>ADICIONAL NOTURNO (%)</span><input type="number" value={nightShiftExtra} onChange={e => setNightShiftExtra(Number(e.target.value))} className="form-control" /></label>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-5">
        <button onClick={onClose} className="btn-outline px-4">CANCELAR</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary px-4 disabled:opacity-60">{saving ? 'SALVANDO...' : 'SALVAR'}</button>
      </div>
    </div>
  );
}

function ClosingTab({ canManage }: { canManage: boolean }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState<string | null>(null);
  
  const [editModal, setEditModal] = useState<{ open: boolean; item?: any }>({ open: false });
  const [reopenModal, setReopenModal] = useState<{ open: boolean; item?: any }>({ open: false });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);

  const listQuery = useQuery(() => api.timeClosing.list(), []);
  const refresh = () => listQuery.refetch();
  const generateMut = useMutation((value: { month: number; year: number }) => api.timeClosing.generate(value), { onSuccess: refresh });
  const reviewMut = useMutation((id: string) => api.timeClosing.submitReview(id), { onSuccess: refresh });
  const approveMut = useMutation((id: string) => api.timeClosing.approve(id), { onSuccess: refresh });
  const closeMut = useMutation((id: string) => api.timeClosing.close(id), { onSuccess: refresh });
  const deleteMut = useMutation((id: string) => api.timeClosing.delete(id), { onSuccess: refresh });
  
  const handleAdjust = async (field: string, value: number, reason: string) => {
    if (!editModal.item) return;
    setSavingId('adjust');
    try { await api.timeClosing.adjust(editModal.item.id, field, value, reason); await refresh(); setEditModal({ open: false }); } 
    catch (err: any) { setError(err?.message ?? 'Erro ao ajustar'); } 
    finally { setSavingId(null); }
  };

  const handleReopen = async (reason: string) => {
    if (!reopenModal.item) return;
    setSavingId('reopen');
    try { await api.timeClosing.reopen(reopenModal.item.id, reason); await refresh(); setReopenModal({ open: false }); } 
    catch (err: any) { setError(err?.message ?? 'Erro ao reabrir'); } 
    finally { setSavingId(null); }
  };

  const closings = (listQuery.data as any[] | undefined) ?? [];
  const money = (value: unknown) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const period = (item: any) => `${new Date(item.periodStart).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a ${new Date(item.periodEnd).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;
  const labels: Record<string, string> = { DRAFT: 'Rascunho', IN_REVIEW: 'Em revisão', APPROVED: 'Aprovado', CLOSED: 'Fechado' };
  const totals = closings.reduce((acc: any, item: any) => ({
    gross: acc.gross + Number(item.grossPay || 0), inss: acc.inss + Number(item.inssDiscount || 0),
    irrf: acc.irrf + Number(item.irrfDiscount || 0), fgts: acc.fgts + Number(item.fgtsAmount || 0), net: acc.net + Number(item.netPay || 0),
  }), { gross: 0, inss: 0, irrf: 0, fgts: 0, net: 0 });

  const generate = async () => {
    setError(null);
    try { await generateMut.mutate({ month, year }); } catch (err: any) { setError(err?.message ?? 'Erro ao gerar fechamento'); }
  };

  const printClosing = async (summary: any) => {
    setPdfId(summary.id);
    setError(null);
    try {
      await managementDocumentsApi.closing(summary.id);
    } catch (error: any) {
      setError(error?.message ?? 'Não foi possível gerar o PDF do fechamento.');
    } finally {
      setPdfId(null);
    }
  };

  if (listQuery.loading && !listQuery.data) return <LoadingState label="Carregando fechamentos..." />;
  if (listQuery.error && !listQuery.data) return <ErrorState message={listQuery.error} onRetry={refresh} />;
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  return (
    <section className="space-y-6 pt-8 border-t border-slate-200">
      {editModal.open && editModal.item && <EditClosingModal item={editModal.item} onClose={() => setEditModal({ open: false })} onSave={handleAdjust} saving={savingId === 'adjust'} />}
      {reopenModal.open && reopenModal.item && <ReopenClosingModal onClose={() => setReopenModal({ open: false })} onSave={handleReopen} saving={savingId === 'reopen'} />}
      
      <div>
        <h3 className="text-sm font-black text-slate-950">FECHAMENTO DA FOLHA</h3>
        <p className="mt-1 text-xs text-slate-500">Jornada, proventos, tributos, encargos e líquido por colaborador.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Base',totals.gross],
          ['INSS',totals.inss],
          ['IRRF',totals.irrf],
          ['FGTS patronal',totals.fgts],
          ['Líquido',totals.net]
        ].map(([label,value]) => (
          <div key={String(label)} className="surface p-4 text-center sm:text-left">
            <p className="text-[10px] font-black uppercase text-slate-400">{String(label)}</p>
            <p className="mt-1 text-base font-black text-[var(--color-brand)]">{money(value)}</p>
          </div>
        ))}
      </div>

      <div className="surface p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="form-group flex-1 max-w-[150px]">
            <span>MÊS</span>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="form-control">
              {months.map((name,index)=><option key={name} value={index+1}>{name}</option>)}
            </select>
          </label>
          <label className="form-group flex-1 max-w-[150px]">
            <span>ANO</span>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="form-control" />
          </label>
          <button onClick={generate} disabled={!canManage || generateMut.loading} className="btn-primary h-10 px-5 text-xs">
            {generateMut.loading ? 'CALCULANDO...' : 'ADICIONAR / RECALCULAR'}
          </button>
        </div>
        {error && <p className="mt-3 text-xs font-bold text-rose-600">{error}</p>}
      </div>

      {closings.length === 0 ? (
        <div className="surface p-12 text-center">
          <FileCheck2 size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-black text-slate-500">Nenhum fechamento calculado para exibição</p>
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Jornada</th>
                <th>Proventos</th>
                <th>Descontos</th>
                <th>FGTS</th>
                <th>Líquido</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {closings.map((item:any)=>(
                <tr key={item.id} className="align-top hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-black text-slate-800">{item.employee?.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{period(item)}</p>
                    <p className="text-[10px] text-[var(--color-brand)] font-bold mt-1">Base {money(item.salaryBase)}</p>
                  </td>
                  <td className="p-4 space-y-1 text-slate-600 text-[11px]">
                    <p>50% <span className="font-bold">{Number(item.overtime50).toFixed(2)}h</span></p>
                    <p>100% <span className="font-bold">{Number(item.overtime100).toFixed(2)}h</span></p>
                    <p>Noturno <span className="font-bold">{Number(item.nightShift).toFixed(2)}h</span></p>
                    <p className="text-rose-500">Faltas <span className="font-bold">{item.absenceMinutes} min</span></p>
                    {(item.lateMinutes || 0) > 0 && <p className="text-amber-600 font-medium">Atrasos <span className="font-bold">{item.lateMinutes} min</span></p>}
                    {(item.earlyLeaveMinutes || 0) > 0 && <p className="text-amber-600 font-medium">Saída Ant. <span className="font-bold">{item.earlyLeaveMinutes} min</span></p>}
                  </td>
                  <td className="p-4 space-y-1 text-slate-600 text-[11px]">
                    <p>Extras {money(Number(item.overtime50Value)+Number(item.overtime100Value))}</p>
                    <p>Noturno {money(item.nightShiftValue)}</p>
                    <p>DSR {money(item.dsrValue)}</p>
                    <p className="text-slate-900 mt-2 font-black">Bruto {money(item.grossPay)}</p>
                  </td>
                  <td className="p-4 space-y-1 text-rose-600 text-[11px]">
                    <p>Faltas {money(item.absenceDiscount)}</p>
                    {(item.lateDiscount || 0) > 0 && <p>Atrasos {money(item.lateDiscount)}</p>}
                    {(item.earlyLeaveDiscount || 0) > 0 && <p>Saída Ant. {money(item.earlyLeaveDiscount)}</p>}
                    <p>INSS {money(item.inssDiscount)}</p>
                    <p>IRRF {money(item.irrfDiscount)}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-black text-slate-800">{money(item.fgtsAmount)}</p>
                    <p className="text-[10px] text-slate-400">não descontado</p>
                  </td>
                  <td className="p-4">
                    <p className="text-base font-black text-emerald-600">{money(item.netPay)}</p>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${item.status==='CLOSED'?'bg-slate-100 text-slate-600':item.status==='APPROVED'?'bg-emerald-50 text-emerald-700':item.status==='IN_REVIEW'?'bg-sky-50 text-sky-700':'bg-amber-50 text-amber-700'}`}>{labels[item.status] || item.status}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap justify-end gap-1.5 w-full">
                      <button onClick={()=>printClosing(item)} disabled={pdfId === item.id} className="btn-outline h-7 px-2 text-[10px] flex items-center gap-1 disabled:opacity-60"><FileText size={12}/> {pdfId === item.id ? '...' : 'PDF'}</button>
                      {canManage && ['DRAFT','IN_REVIEW'].includes(item.status) && <button onClick={() => setEditModal({ open: true, item })} className="btn-outline h-7 px-2 text-[10px] flex items-center gap-1"><MessageSquare size={12}/> Editar</button>}
                      {canManage && item.status==='DRAFT' && <button onClick={()=>reviewMut.mutate(item.id)} className="btn-primary bg-sky-600 hover:bg-sky-700 border-sky-600 h-7 px-2 text-[10px] flex items-center gap-1"><Send size={12}/> Revisar</button>}
                      {canManage && item.status==='IN_REVIEW' && <button onClick={()=>approveMut.mutate(item.id)} className="btn-primary h-7 px-2 text-[10px] flex items-center gap-1"><Check size={12}/> Aprovar</button>}
                      {canManage && item.status==='APPROVED' && <button onClick={()=>closeMut.mutate(item.id)} className="btn-primary bg-slate-900 hover:bg-black border-slate-900 h-7 px-2 text-[10px] flex items-center gap-1"><Zap size={12}/> Fechar</button>}
                      {canManage && item.status==='CLOSED' && <button onClick={() => setReopenModal({ open: true, item })} className="btn-primary bg-amber-500 hover:bg-amber-600 border-amber-500 h-7 px-2 text-[10px] flex items-center gap-1"><RefreshCcw size={12}/> Reabrir</button>}
                      {canManage && item.status!=='CLOSED' && <button onClick={()=>window.confirm('Excluir este fechamento?')&&deleteMut.mutate(item.id)} className="btn-danger h-7 px-2 text-[10px] flex items-center gap-1"><XCircle size={12}/> Excluir</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EditClosingModal({ item, onClose, onSave, saving }: {
  item: any; onClose: () => void; onSave: (field: string, value: number, reason: string) => void; saving: boolean;
}) {
  const [field, setField] = useState('salaryBase');
  const [value, setValue] = useState(String(item[field] || 0));
  const [reason, setReason] = useState('');
  
  useEffect(() => { setValue(String(item[field] || 0)); }, [field, item]);

  const fields = [
    { id: 'salaryBase', label: 'Salário Base (R$)' },
    { id: 'overtime50', label: 'Horas Extras 50% (h)' },
    { id: 'overtime100', label: 'Horas Extras 100% (h)' },
    { id: 'nightShift', label: 'Adicional Noturno (h)' },
    { id: 'absenceMinutes', label: 'Faltas / Atrasos (min)' },
    { id: 'lateMinutes', label: 'Atrasos Ponto (min)' },
    { id: 'earlyLeaveMinutes', label: 'Saídas Antecipadas (min)' },
  ];

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const num = Number(value.replace(',', '.'));
    if (!Number.isFinite(num) || num < 0) return alert('Valor inválido');
    if (!reason.trim()) return alert('Justificativa obrigatória');
    onSave(field, num, reason.trim());
  };

  return (
    <div className="modal">
      <div className="surface w-full max-w-md">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-lg font-black text-slate-900">Ajuste Manual</h3>
          <button onClick={onClose} disabled={saving} className="rounded-full p-2 hover:bg-slate-100"><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-slate-500">Colaborador: <b className="text-black">{item.employee?.name}</b></p>
          <label className="form-group">
            <span>CAMPO PARA AJUSTE</span>
            <select value={field} onChange={e => setField(e.target.value)} disabled={saving} className="form-control">
              {fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <label className="form-group">
            <span>NOVO VALOR</span>
            <input type="text" value={value} onChange={e => setValue(e.target.value)} disabled={saving} required className="form-control" />
          </label>
          <label className="form-group">
            <span>JUSTIFICATIVA</span>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} disabled={saving} required placeholder="Motivo do ajuste..." className="form-control" />
          </label>
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} disabled={saving} className="btn-outline px-4">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary px-5">{saving ? 'Salvando...' : 'Aplicar Ajuste'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReopenClosingModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (reason: string) => void; saving: boolean; }) {
  const [reason, setReason] = useState('');
  const handleSubmit = (e: any) => { e.preventDefault(); if (!reason.trim()) return alert('Obrigatório'); onSave(reason.trim()); };
  
  return (
    <div className="modal">
      <div className="surface w-full max-w-sm">
        <h3 className="text-lg font-black text-slate-900">Motivo da reabertura</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input type="text" autoFocus value={reason} onChange={e => setReason(e.target.value)} disabled={saving} required placeholder="Justificativa..." className="form-control" />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="btn-outline px-4">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary bg-amber-500 hover:bg-amber-600 border-amber-500 px-5">{saving ? 'Salvando...' : 'Confirmar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
