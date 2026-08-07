'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api, type Employee, type EmployeeAsoRecord } from '@/app/lib/api';
import { normalizeDisplayName } from '@/app/lib/text';
import { managementDocumentsApi } from '../management-documents-api';
import { FileCheck2, XCircle, X, FileText, Activity } from 'lucide-react';
import { LoadingState, ErrorState } from '@/app/components/data-states';

const ASO_TYPES: { value: string; label: string }[] = [
  { value: 'ADMISSIONAL', label: 'Admissional' },
  { value: 'DEMISSIONAL', label: 'Demissional' },
  { value: 'PERIODICO', label: 'Periódico / Rotina' },
  { value: 'RETORNO_AO_TRABALHO', label: 'Retorno ao trabalho' },
  { value: 'MUDANCA_DE_FUNCAO', label: 'Mudança de função' },
  { value: 'COMPLEMENTAR', label: 'Complementar' },
];

const ASO_STATUSES: { value: string; label: string }[] = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'SCHEDULED', label: 'Agendado' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'CANCELLED', label: 'Cancelado' },
  { value: 'EXPIRED', label: 'Vencido' },
  { value: 'WAITING_DOCUMENT', label: 'Aguardando doc' },
  { value: 'WAITING_ADDITIONAL_EXAM', label: 'Exame extra' },
];

function fmtDate(v?: string | null) {
  if (!v) return '---';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function getAsoAlert(status: string, dueDate?: string | null): { label: string; cls: string } {
  if (status === 'COMPLETED' || status === 'APTO') return { label: 'Concluído', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (status === 'CANCELLED') return { label: 'Cancelado', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  if (!dueDate) return { label: 'Sem data definida', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  const today = new Date();
  const exp = new Date(dueDate);
  if (exp < today) return { label: 'Vencido', cls: 'bg-red-50 text-red-700 border-red-200' };
  const diff = (exp.getTime() - today.getTime()) / 86400000;
  if (diff <= 30) return { label: 'Próximo do vencimento', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Válido', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

export default function AsoPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canView = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH' || profile === 'GESTOR';
  const canManage = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';

  const [asoForm, setAsoForm] = useState<{ open: boolean; edit?: EmployeeAsoRecord }>({ open: false });

  const asoQuery = useQuery(() => api.management.aso.list(), [], { enabled: canView });
  const employeesQuery = useQuery(() => api.employees.list(), [], { enabled: canView });

  const asoMut = useMutation((input: { id?: string; data: any }) => {
    if (input.id) return api.management.aso.update(input.id, input.data);
    return api.management.aso.create(input.data);
  }, { onSuccess: () => { setAsoForm({ open: false }); asoQuery.refetch(); } });

  const deleteAsoMut = useMutation((id: string) => api.management.aso.delete(id), { onSuccess: () => asoQuery.refetch() });

  const asos = useMemo(() => (asoQuery.data as EmployeeAsoRecord[] | undefined) ?? [], [asoQuery.data]);
  const employees = useMemo(() => (employeesQuery.data as Employee[] | undefined) ?? [], [employeesQuery.data]);

  if (asoQuery.loading && !asoQuery.data) return <LoadingState label="Carregando ASOs..." />;
  if (asoQuery.error && !asoQuery.data) return <ErrorState message={asoQuery.error} onRetry={asoQuery.refetch} />;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">ASOs vencidos</p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {asos.filter((aso) => aso.status === 'EXPIRED' || (aso.dueDate && new Date(aso.dueDate) < new Date() && aso.status !== 'COMPLETED' && aso.status !== 'CANCELLED')).length}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">ASOs pendentes</p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {asos.filter((aso) => aso.status === 'PENDING').length}
          </p>
        </div>
      </div>

      <AsoTab
        records={asos}
        employees={employees}
        canManage={canManage}
        onOpenForm={(edit) => setAsoForm({ open: true, edit })}
        onSave={(data, id) => asoMut.mutate({ id, data }).catch(() => {})}
        onDelete={(id) => deleteAsoMut.mutate(id).catch(() => {})}
        saving={asoMut.loading}
      />

      {asoForm.open && (
        <AsoModal
          record={asoForm.edit}
          employees={employees}
          asos={asos}
          onClose={() => setAsoForm({ open: false })}
          onSave={(data) => asoMut.mutate({ id: asoForm.edit?.id, data }).catch(() => {})}
          saving={asoMut.loading}
        />
      )}
    </div>
  );
}

function AsoTab({ records, employees, canManage, onOpenForm, onSave, onDelete, saving }: {
  records: EmployeeAsoRecord[]; employees: Employee[]; canManage: boolean;
  onOpenForm: (edit?: EmployeeAsoRecord) => void; onSave: (data: any, id?: string) => void;
  onDelete: (id: string) => void; saving: boolean;
}) {
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEmp, setFilterEmp] = useState('');
  const [pdfId, setPdfId] = useState<string | null>(null);

  const filtered = useMemo(() => records.filter(r => {
    if (filterType && r.asoType !== filterType) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterEmp && r.employeeId !== filterEmp) return false;
    return true;
  }).slice().sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return da - db;
  }), [records, filterType, filterStatus, filterEmp]);

  const empName = (id: string) => employees.find(e => e.id === id)?.name ?? '---';

  const handleGenerateAsoPdf = async (r: EmployeeAsoRecord) => {
    setPdfId(r.id);
    try {
      await managementDocumentsApi.asoReferral(r.id);
    } catch (error: any) {
      window.alert(error?.message ?? 'Não foi possível gerar o encaminhamento.');
    } finally {
      setPdfId(null);
    }
  };

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-950">CONTROLE DE ASO</h3>
          <p className="mt-1 text-xs text-slate-500">Atestados de saúde ocupacional dos colaboradores.</p>
        </div>
        {canManage && (
          <button onClick={() => onOpenForm(undefined)} disabled={saving} className="btn-primary inline-flex h-9 items-center gap-2 px-4 text-xs">
            + NOVO ASO
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3 bg-slate-50">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-control max-w-[200px]">
          <option value="">TODOS TIPOS</option>{ASO_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-control max-w-[200px]">
          <option value="">TODOS STATUS</option>{ASO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="form-control max-w-[200px]">
          <option value="">TODOS FUNCIONÁRIOS</option>{employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}
        </select>
      </div>
      
      <div className="overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>FUNCIONÁRIO</th>
              <th>TIPO</th>
              <th>Exame</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Clínica</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand)]/10 mb-4 text-[var(--color-brand)]">
                      <FileCheck2 size={28} />
                    </div>
                    <h4 className="text-sm font-black text-slate-900">Nenhum ASO registrado</h4>
                    <p className="mt-1 text-xs text-slate-500">A saúde ocupacional é obrigatória por lei.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(r => {
                const alert = getAsoAlert(r.status, r.dueDate);
                return (
                  <tr key={r.id}>
                    <td className="font-bold text-slate-950">{empName(r.employeeId)}</td>
                    <td>{r.asoType}</td>
                    <td>{fmtDate(r.examDate)}</td>
                    <td>{fmtDate(r.dueDate)}</td>
                    <td><span className={`inline-flex rounded-[5px] border px-2 py-0.5 text-[10px] font-black ${alert.cls}`}>{alert.label}</span></td>
                    <td className="truncate max-w-[150px]">{r.clinicName ?? '---'}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => handleGenerateAsoPdf(r)} disabled={pdfId === r.id} className="btn-outline h-7 px-2 text-[10px] font-bold disabled:opacity-60">{pdfId === r.id ? 'Gerando...' : 'PDF'}</button>
                        <button onClick={() => onOpenForm(r)} disabled={saving} className="btn-outline h-7 px-2 text-[10px] font-bold">Editar</button>
                        {canManage && <button onClick={() => onSave({ status: 'CANCELLED' }, r.id)} disabled={saving} className="btn-danger h-7 px-2 text-[10px] flex items-center gap-1"><XCircle size={12}/></button>}
                        {canManage && <button onClick={() => { if (window.confirm('Excluir?')) onDelete(r.id); }} disabled={saving} className="btn-danger h-7 px-2 text-[10px] font-black">X</button>}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AsoModal({ record, employees, asos, onClose, onSave, saving }: {
  record?: EmployeeAsoRecord; employees: Employee[]; asos: EmployeeAsoRecord[]; onClose: () => void; onSave: (data: any) => void; saving: boolean;
}) {
  const init = record ?? { employeeId: '', asoType: 'PERIODICO', status: 'PENDENTE', result: null, examDate: '', dueDate: '', clinicName: '', doctorName: '', observation: '' };
  const [employeeId, setEmployeeId] = useState(init.employeeId ?? '');
  const [asoType, setAsoType] = useState(init.asoType as string);
  const [status, setStatus] = useState(init.status as string);
  const [result, setResult] = useState<'APTO' | 'INAPTO' | ''>(init.result ?? '');
  const [examDate, setExamDate] = useState(init.examDate?.slice(0, 16) ?? '');
  const [dueDate, setDueDate] = useState(init.dueDate?.slice(0, 10) ?? '');
  
  const [clinicName, setClinicName] = useState(init.clinicName ?? '');
  const [doctorName, setDoctorName] = useState(init.doctorName ?? '');
  const [clinicCep, setClinicCep] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicCity, setClinicCity] = useState('');
  const [clinicState, setClinicState] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [observation, setObservation] = useState(init.observation ?? '');

  const ok = !!employeeId && (status !== 'COMPLETED' || !!result);
  const save = () => {
    if (!ok) return;
    onSave({
      employeeId,
      asoType,
      status,
      result: status === 'COMPLETED' ? result : null,
      examDate: examDate ? new Date(examDate).toISOString() : null,
      dueDate: dueDate || null,
      clinicName: clinicName.trim() || null,
      doctorName: doctorName.trim() || null,
      observation: observation.trim() || null,
      saveClinicPreset: false,
      clinicCep, clinicAddress, clinicCity, clinicState, clinicPhone
    });
  };

  return (
    <div className="modal">
      <div className="surface max-h-[92vh] w-full max-w-3xl overflow-y-auto">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand)]">
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">{record ? 'Editar ASO' : 'Agendar ASO'}</h3>
              <p className="text-xs font-semibold text-slate-500">Atestado de Saúde Ocupacional</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X size={20}/></button>
        </div>

        <div className="grid gap-x-6 gap-y-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase text-slate-800">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px]">1</span> Identificação
            </h4>
            <label className="form-group">
              <span>Funcionário *</span>
              <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="form-control">
                <option value="">Selecione...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="form-group">
                <span>Tipo *</span>
                <select value={asoType} onChange={e => setAsoType(e.target.value)} className="form-control">
                  {ASO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label className="form-group">
                <span>Status</span>
                <select value={status} onChange={e => setStatus(e.target.value)} className="form-control">
                  {ASO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
            </div>
            {status === 'COMPLETED' && (
              <label className="form-group rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <span className="text-emerald-900">Resultado *</span>
                <select value={result} onChange={e => setResult(e.target.value as 'APTO' | 'INAPTO' | '')} className="form-control border-emerald-200 focus:border-emerald-500">
                  <option value="">Selecione...</option>
                  <option value="APTO">Apto para a função</option>
                  <option value="INAPTO">Inapto para a função</option>
                </select>
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="form-group">
                <span>Data do Exame</span>
                <input type="datetime-local" value={examDate} onChange={e => setExamDate(e.target.value)} className="form-control"/>
              </label>
              <label className="form-group opacity-80">
                <span>Vencimento</span>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="form-control"/>
              </label>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase text-slate-800">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px]">2</span> Clínica
            </h4>
            <label className="form-group">
              <span>Nome da Clínica</span>
              <input value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Clínica..." className="form-control"/>
            </label>
            <label className="form-group">
              <span>Endereço</span>
              <input value={clinicAddress} onChange={e => setClinicAddress(e.target.value)} placeholder="Endereço..." className="form-control"/>
            </label>
            <label className="form-group">
              <span>Médico</span>
              <input value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Dr. ..." className="form-control"/>
            </label>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <label className="form-group">
            <span>Observações</span>
            <textarea value={observation} onChange={e => setObservation(e.target.value)} rows={2} className="form-control resize-none"/>
          </label>
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-6">
          <button onClick={onClose} className="btn-outline px-6">Cancelar</button>
          <button onClick={save} disabled={!ok || saving} className="btn-primary px-8 disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar ASO'}</button>
        </div>
      </div>
    </div>
  );
}
