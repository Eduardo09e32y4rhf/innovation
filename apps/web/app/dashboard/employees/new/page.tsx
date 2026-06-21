'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type ContractType, type CreateEmployeeInput, type DailyWorkload, type Employee, type EmployeeStatus, type WorkScale } from '@/app/lib/api';
import { normalizeDisplayName } from '@/app/lib/text';

const STATUS_OPTIONS: { value: EmployeeStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Férias' },
  { value: 'SUSPENDED', label: 'Afastado' },
  { value: 'TERMINATED', label: 'Desligado' },
];

const DEPARTMENT_OPTIONS = ['RH', 'Financeiro', 'Operação', 'Comercial', 'TI', 'Administrativo', 'Jurídico', 'Logística', 'Produção'];
const POSITION_OPTIONS = ['Auxiliar', 'Assistente', 'Analista', 'Operador', 'Supervisor', 'Coordenador', 'Gerente', 'Diretor'];
const UNIT_OPTIONS = ['Matriz', 'Filial', 'Operação externa', 'Remoto', 'Híbrido'];
const WORK_SCALE_OPTIONS: { value: WorkScale; label: string }[] = [
  { value: '5X2', label: '5x2' },
  { value: '6X1', label: '6x1' },
  { value: '12X36', label: '12x36' },
  { value: '4X2', label: '4x2' },
  { value: 'OUTRO', label: 'Outro' },
];
const DAILY_WORKLOAD_OPTIONS: { value: DailyWorkload; label: string }[] = [
  { value: '08:00', label: '08:00' },
  { value: '07:20', label: '07:20' },
  { value: '06:00', label: '06:00' },
  { value: '12:00', label: '12:00' },
  { value: 'OUTRO', label: 'Outro' },
];
const CONTRACT_OPTIONS: { value: ContractType; label: string }[] = [
  { value: 'CLT', label: 'CLT' },
  { value: 'PJ', label: 'PJ' },
  { value: 'ESTAGIO', label: 'Estágio' },
  { value: 'TEMPORARIO', label: 'Temporário' },
  { value: 'JOVEM_APRENDIZ', label: 'Jovem Aprendiz' },
  { value: 'TERCEIRIZADO', label: 'Terceirizado' },
];
const TABS = ['Dados pessoais', 'Dados profissionais', 'Jornada', 'Contrato e acesso'] as const;

type TabName = (typeof TABS)[number];

type EmployeeFormState = CreateEmployeeInput & {
  accessEnabled: 'NO' | 'YES';
  accessProfile: 'FUNCIONARIO' | 'GESTOR' | 'RH' | 'ADMIN';
};

const EMPTY: EmployeeFormState = {
  name: '', cpf: '', email: '', phone: '', birthDate: '', registration: '',
  position: 'Assistente', department: 'Operação', managerId: '',
  admissionDate: '', terminationDate: '', status: 'ACTIVE', unit: 'Matriz',
  salary: undefined, contractType: 'CLT', cnpj: '', legalName: '', tradeName: '',
  workScale: '5X2', customWorkScale: '', dailyWorkload: '08:00',
  standardEntry: '', standardLunchStart: '', standardLunchReturn: '', standardExit: '',
  accessEnabled: 'NO', accessProfile: 'FUNCIONARIO',
};

export default function NewEmployeePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl py-16 text-center text-sm text-slate-500">Carregando...</div>}>
      <EmployeeForm />
    </Suspense>
  );
}

function EmployeeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');
  const isEdit = Boolean(editId);
  const employeesQuery = useQuery(() => api.employees.list(), []);

  const [form, setForm] = useState<EmployeeFormState>(EMPTY);
  const [activeTab, setActiveTab] = useState<TabName>('Dados pessoais');
  const [loadingEmployee, setLoadingEmployee] = useState(isEdit);

  useEffect(() => {
    if (!editId) return;
    let active = true;
    api.employees
      .get(editId)
      .then((emp) => {
        if (!active) return;
        setForm({
          name: emp.name,
          cpf: emp.cpf,
          email: emp.email,
          phone: emp.phone ?? '',
          birthDate: dateInput(emp.birthDate),
          registration: emp.registration ?? '',
          position: emp.position,
          department: emp.department,
          managerId: emp.managerId ?? '',
          admissionDate: dateInput(emp.admissionDate),
          terminationDate: dateInput(emp.terminationDate),
          salary: emp.salary ? Number(emp.salary) : undefined,
          status: emp.status,
          contractType: emp.contractType ?? 'CLT',
          cnpj: emp.cnpj ?? '',
          legalName: emp.legalName ?? '',
          tradeName: emp.tradeName ?? '',
          unit: emp.unit ?? 'Matriz',
          workScale: emp.workScale ?? '5X2',
          customWorkScale: emp.customWorkScale ?? '',
          dailyWorkload: emp.dailyWorkload ?? '08:00',
          standardEntry: emp.standardEntry ?? '',
          standardLunchStart: emp.standardLunchStart ?? '',
          standardLunchReturn: emp.standardLunchReturn ?? '',
          standardExit: emp.standardExit ?? '',
          accessEnabled: 'NO',
          accessProfile: 'FUNCIONARIO',
        });
      })
      .catch(() => {})
      .finally(() => active && setLoadingEmployee(false));
    return () => {
      active = false;
    };
  }, [editId]);

  const managerOptions = useMemo(() => {
    return (employeesQuery.data ?? []).filter((employee) => employee.id !== editId && employee.status !== 'TERMINATED');
  }, [employeesQuery.data, editId]);

  const save = useMutation(
    (payload: CreateEmployeeInput) =>
      isEdit && editId ? api.employees.update(editId, payload) : api.employees.create(payload),
    { onSuccess: () => router.push('/dashboard/employees') },
  );

  function set<K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    const payload: CreateEmployeeInput = compactPayload({
      name: form.name,
      cpf: form.cpf,
      email: form.email,
      phone: form.phone,
      birthDate: isoDate(form.birthDate),
      registration: form.registration,
      position: form.position,
      department: form.department,
      managerId: form.managerId,
      admissionDate: isoDate(form.admissionDate) ?? '',
      terminationDate: form.status === 'TERMINATED' ? isoDate(form.terminationDate) : undefined,
      salary: form.salary ? Number(form.salary) : undefined,
      status: form.status,
      contractType: form.contractType,
      cnpj: (form.contractType === 'PJ' || form.contractType === 'TERCEIRIZADO') ? form.cnpj : undefined,
      legalName: form.contractType === 'PJ' ? form.legalName : undefined,
      tradeName: form.contractType === 'PJ' ? form.tradeName : undefined,
      unit: form.unit,
      workScale: form.workScale,
      customWorkScale: form.workScale === 'OUTRO' ? form.customWorkScale : undefined,
      dailyWorkload: form.dailyWorkload,
      standardEntry: form.standardEntry,
      standardLunchStart: form.standardLunchStart,
      standardLunchReturn: form.standardLunchReturn,
      standardExit: form.standardExit,
    });
    try {
      await save.mutate(payload);
    } catch {
      /* erro exibido via save.error */
    }
  }

  if (loadingEmployee) {
    return <div className="mx-auto max-w-4xl py-16 text-center text-sm text-slate-500">Carregando funcionário...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex items-center gap-3">
        <Link href="/dashboard/employees" className="btn-outline inline-flex h-9 w-9 items-center justify-center rounded-[8px]">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Funcionários</p>
          <h2 className="text-2xl font-black text-slate-950">{isEdit ? 'Editar colaborador' : 'Novo colaborador'}</h2>
        </div>
      </header>

      {save.error && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{save.error}</p>
      )}

      <section className="ops-card rounded-[8px] border border-slate-200 bg-white p-5">
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`h-9 shrink-0 rounded-[8px] px-3 text-xs font-black ${activeTab === tab ? 'bg-slate-950 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Dados pessoais' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" value={form.name} onChange={(v) => set('name', v)} required />
            <Field label="CPF" value={form.cpf} onChange={(v) => set('cpf', v)} placeholder="000.000.000-00" required />
            <Field label="Data de nascimento" type="date" value={form.birthDate ?? ''} onChange={(v) => set('birthDate', v)} />
            <Field label="E-mail" type="email" value={form.email} onChange={(v) => set('email', v)} required />
            <Field label="Telefone" value={form.phone ?? ''} onChange={(v) => set('phone', v)} placeholder="+55 11 90000-0000" />
            <Field label="Matrícula" value={form.registration ?? ''} onChange={(v) => set('registration', v)} placeholder="EMP-0001" />
          </div>
        )}

        {activeTab === 'Dados profissionais' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data de admissão" type="date" value={form.admissionDate} onChange={(v) => set('admissionDate', v)} required />
            <Select label="Status" value={form.status ?? 'ACTIVE'} onChange={(v) => set('status', v as EmployeeStatus)} options={STATUS_OPTIONS} />
            {form.status === 'TERMINATED' && <Field label="Data de demissão" type="date" value={form.terminationDate ?? ''} onChange={(v) => set('terminationDate', v)} />}
            <Select label="Departamento" value={form.department} onChange={(v) => set('department', v)} options={DEPARTMENT_OPTIONS.map((value) => ({ value, label: value }))} />
            <Select label="Cargo" value={form.position} onChange={(v) => set('position', v)} options={POSITION_OPTIONS.map((value) => ({ value, label: value }))} />
            <ManagerSelect employees={managerOptions} value={form.managerId ?? ''} onChange={(v) => set('managerId', v)} loading={employeesQuery.loading} />
            <Select label="Operação / unidade" value={form.unit ?? 'Matriz'} onChange={(v) => set('unit', v)} options={UNIT_OPTIONS.map((value) => ({ value, label: value }))} />
          </div>
        )}

        {activeTab === 'Jornada' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Escala" value={form.workScale ?? '5X2'} onChange={(v) => set('workScale', v as WorkScale)} options={WORK_SCALE_OPTIONS} />
            {form.workScale === 'OUTRO' && <Field label="Descrição da escala" value={form.customWorkScale ?? ''} onChange={(v) => set('customWorkScale', v)} />}
            <Select label="Jornada diária padrão" value={form.dailyWorkload ?? '08:00'} onChange={(v) => set('dailyWorkload', v as DailyWorkload)} options={DAILY_WORKLOAD_OPTIONS} />
            <Field label="Entrada padrão" type="time" value={form.standardEntry ?? ''} onChange={(v) => set('standardEntry', v)} />
            <Field label="Saída almoço" type="time" value={form.standardLunchStart ?? ''} onChange={(v) => set('standardLunchStart', v)} />
            <Field label="Retorno almoço" type="time" value={form.standardLunchReturn ?? ''} onChange={(v) => set('standardLunchReturn', v)} />
            <Field label="Saída padrão" type="time" value={form.standardExit ?? ''} onChange={(v) => set('standardExit', v)} />
          </div>
        )}

        {activeTab === 'Contrato e acesso' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Salário (R$)" type="number" value={form.salary?.toString() ?? ''} onChange={(v) => set('salary', v ? Number(v) : undefined)} />
            <Select label="Tipo de contrato" value={form.contractType ?? 'CLT'} onChange={(v) => set('contractType', v as ContractType)} options={CONTRACT_OPTIONS} />
            {(form.contractType === 'PJ' || form.contractType === 'TERCEIRIZADO') && (
              <Field label={form.contractType === 'PJ' ? 'CNPJ (obrigatório)' : 'CNPJ da empresa terceira'} value={form.cnpj ?? ''} onChange={(v) => set('cnpj', v)} placeholder="00.000.000/0000-00" required={form.contractType === 'PJ'} />
            )}
            {form.contractType === 'PJ' && (
              <>
                <Field label="Razão social" value={form.legalName ?? ''} onChange={(v) => set('legalName', v)} />
                <Field label="Nome fantasia" value={form.tradeName ?? ''} onChange={(v) => set('tradeName', v)} />
              </>
            )}
            <Select label="Permitir acesso ao painel" value={form.accessEnabled} onChange={(v) => set('accessEnabled', v as 'NO' | 'YES')} options={[{ value: 'NO', label: 'Não' }, { value: 'YES', label: 'Sim' }]} />
            <Select label="Perfil de acesso" value={form.accessProfile} onChange={(v) => set('accessProfile', v as EmployeeFormState['accessProfile'])} options={[{ value: 'FUNCIONARIO', label: 'Funcionário' }, { value: 'GESTOR', label: 'Gestor' }, { value: 'RH', label: 'RH' }, { value: 'ADMIN', label: 'Administrador' }, { value: 'CONSULTA', label: 'Consulta' }]} />
            <p className="sm:col-span-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              O acesso ao painel será ligado ao módulo de usuários. Este cadastro já deixa os dados do colaborador prontos para vínculo.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link href="/dashboard/employees" className="btn-outline inline-flex h-10 items-center justify-center rounded-[8px] px-4 text-xs font-bold">Cancelar</Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={save.loading}
            className="crystal-button inline-flex h-10 items-center justify-center gap-2 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            <Save size={14} />
            {save.loading ? 'Salvando...' : 'Salvar colaborador'}
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-600">
      <span>{label}{required && <span className="text-rose-500"> *</span>}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-600">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ManagerSelect({ employees, value, onChange, loading }: { employees: Employee[]; value: string; onChange: (value: string) => void; loading: boolean }) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-600">
      <span>Gestor</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
        <option value="">{loading ? 'Carregando gestores...' : 'Sem gestor definido'}</option>
        {employees.map((employee) => <option key={employee.id} value={employee.id}>{normalizeDisplayName(employee.name)}</option>)}
      </select>
    </label>
  );
}

function dateInput(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function isoDate(value?: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function compactPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== '' && value !== undefined && value !== null)) as T;
}