'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useMutation } from '@/app/hooks/use-data';
import { api, type CreateEmployeeInput, type EmployeeStatus } from '@/app/lib/api';

const STATUS_OPTIONS: { value: EmployeeStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
  { value: 'SUSPENDED', label: 'Suspenso' },
  { value: 'TERMINATED', label: 'Desligado' },
];

const EMPTY: CreateEmployeeInput = {
  name: '', cpf: '', email: '', phone: '', position: '', department: '',
  admissionDate: '', salary: undefined, status: 'ACTIVE',
};

export default function NewEmployeePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl py-16 text-center text-sm text-slate-500">Carregando...</div>}>
      <EmployeeForm />
    </Suspense>
  );
}

function EmployeeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');
  const isEdit = Boolean(editId);

  const [form, setForm] = useState<CreateEmployeeInput>(EMPTY);
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
          position: emp.position,
          department: emp.department,
          admissionDate: emp.admissionDate ? emp.admissionDate.slice(0, 10) : '',
          salary: emp.salary ? Number(emp.salary) : undefined,
          status: emp.status,
        });
      })
      .catch(() => {})
      .finally(() => active && setLoadingEmployee(false));
    return () => {
      active = false;
    };
  }, [editId]);

  const save = useMutation(
    (payload: CreateEmployeeInput) =>
      isEdit && editId ? api.employees.update(editId, payload) : api.employees.create(payload),
    { onSuccess: () => router.push('/dashboard/employees') },
  );

  function set<K extends keyof CreateEmployeeInput>(key: K, value: CreateEmployeeInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    const payload: CreateEmployeeInput = {
      ...form,
      admissionDate: form.admissionDate ? new Date(form.admissionDate).toISOString() : '',
      salary: form.salary ? Number(form.salary) : undefined,
      phone: form.phone || undefined,
    };
    try {
      await save.mutate(payload);
    } catch {
      /* erro exibido via save.error */
    }
  }

  if (loadingEmployee) {
    return <div className="mx-auto max-w-3xl py-16 text-center text-sm text-slate-500">Carregando funcionario...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-center gap-3">
        <Link href="/dashboard/employees" className="btn-outline inline-flex h-9 w-9 items-center justify-center rounded-[8px]">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Funcionarios</p>
          <h2 className="text-2xl font-black text-slate-950">{isEdit ? 'Editar funcionario' : 'Novo funcionario'}</h2>
        </div>
      </header>

      {save.error && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{save.error}</p>
      )}

      <div className="ops-card grid gap-4 rounded-[8px] border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <Field label="Nome" value={form.name} onChange={(v) => set('name', v)} required />
        <Field label="CPF" value={form.cpf} onChange={(v) => set('cpf', v)} placeholder="000.000.000-00" required />
        <Field label="E-mail" type="email" value={form.email} onChange={(v) => set('email', v)} required />
        <Field label="Telefone" value={form.phone ?? ''} onChange={(v) => set('phone', v)} placeholder="+55 11 90000-0000" />
        <Field label="Cargo" value={form.position} onChange={(v) => set('position', v)} required />
        <Field label="Departamento" value={form.department} onChange={(v) => set('department', v)} required />
        <Field label="Data de admissao" type="date" value={form.admissionDate} onChange={(v) => set('admissionDate', v)} required />
        <Field
          label="Salario (R$)"
          type="number"
          value={form.salary?.toString() ?? ''}
          onChange={(v) => set('salary', v ? Number(v) : undefined)}
        />

        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value as EmployeeStatus)}
            className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={save.loading}
            className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            <Save size={14} />
            {save.loading ? 'Salvando...' : 'Salvar funcionario'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder, required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-600">
      <span>{label}{required && <span className="text-rose-500"> *</span>}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
      />
    </label>
  );
}
