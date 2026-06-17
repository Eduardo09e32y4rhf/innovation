"use client";

import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  ClipboardList,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

type EmployeeStatus = 'Ativo' | 'Admissao' | 'Afastado' | 'Demitido';

type EmployeeForm = {
  registration: string;
  name: string;
  birthDate: string;
  role: string;
  manager: string;
  admissionDate: string;
  dismissalDate: string;
  gender: string;
  education: string;
  schedule: string;
  modality: string;
  salary: string;
  zipCode: string;
  street: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  status: EmployeeStatus;
};

type Employee = EmployeeForm & { id: string };

const roleOptions = [
  'Analista de RH',
  'Assistente Administrativo',
  'Operador',
  'Vendedor',
  'Supervisor',
  'Coordenador',
  'Gerente',
  'Diretor',
];

const managerOptions = [
  'Sem gestor',
  'Patricia Gomes',
  'Eduardo Silva',
  'Marcos Lima',
  'Carla Nunes',
];

const genderOptions = ['Masculino', 'Feminino', 'Trans', 'Nao binario', 'Prefere nao informar'];

const educationOptions = [
  'Ensino fundamental',
  'Ensino medio',
  'Tecnico',
  'Superior cursando',
  'Superior completo',
  'Pos-graduacao',
  'Mestrado',
  'Doutorado',
];

const scheduleOptions = [
  '5x2 - 44h semanais / 8h48 por dia',
  '5x2 - 40h semanais / 8h por dia',
  '6x1 - 44h semanais / 7h20 por dia',
  '12x36 - 12h trabalho / 36h descanso',
  'Parcial - ate 30h semanais',
  'Parcial - 26h semanais + ate 6h extras',
  'Intermitente - convocacao por periodo',
];

const modalityOptions = ['Presencial', 'Home office', 'Hibrido'];

const emptyForm: EmployeeForm = {
  registration: '',
  name: '',
  birthDate: '',
  role: roleOptions[0],
  manager: managerOptions[0],
  admissionDate: new Date().toISOString().slice(0, 10),
  dismissalDate: '',
  gender: genderOptions[0],
  education: educationOptions[1],
  schedule: scheduleOptions[0],
  modality: modalityOptions[0],
  salary: '2200',
  zipCode: '',
  street: '',
  addressNumber: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  status: 'Ativo',
};

const initialEmployees: Employee[] = [
  {
    id: 'colab-001',
    registration: '000001',
    name: 'Eduardo Silva',
    birthDate: '1992-04-18',
    role: 'Analista de RH',
    manager: 'Patricia Gomes',
    admissionDate: '2025-03-10',
    dismissalDate: '',
    gender: 'Masculino',
    education: 'Superior completo',
    schedule: '5x2 - 44h semanais / 8h48 por dia',
    modality: 'Presencial',
    salary: '4200',
    zipCode: '01001000',
    street: 'Praca da Se',
    addressNumber: '100',
    complement: '',
    neighborhood: 'Se',
    city: 'Sao Paulo',
    state: 'SP',
    status: 'Ativo',
  },
  {
    id: 'colab-002',
    registration: '000002',
    name: 'Bianca Rocha',
    birthDate: '1998-08-04',
    role: 'Assistente Administrativo',
    manager: 'Eduardo Silva',
    admissionDate: '2026-01-15',
    dismissalDate: '',
    gender: 'Feminino',
    education: 'Superior cursando',
    schedule: '5x2 - 40h semanais / 8h por dia',
    modality: 'Hibrido',
    salary: '2600',
    zipCode: '01311000',
    street: 'Avenida Paulista',
    addressNumber: '900',
    complement: 'Conjunto 12',
    neighborhood: 'Bela Vista',
    city: 'Sao Paulo',
    state: 'SP',
    status: 'Ativo',
  },
  {
    id: 'colab-003',
    registration: '000003',
    name: 'Renan Alves',
    birthDate: '1995-11-22',
    role: 'Operador',
    manager: 'Marcos Lima',
    admissionDate: '2026-06-01',
    dismissalDate: '',
    gender: 'Trans',
    education: 'Ensino medio',
    schedule: '6x1 - 44h semanais / 7h20 por dia',
    modality: 'Presencial',
    salary: '2200',
    zipCode: '20040002',
    street: 'Rua da Assembleia',
    addressNumber: '45',
    complement: '',
    neighborhood: 'Centro',
    city: 'Rio de Janeiro',
    state: 'RJ',
    status: 'Admissao',
  },
];

export default function ColaboradoresPage() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [form, setForm] = useState<EmployeeForm>({ ...emptyForm, registration: nextRegistration(initialEmployees) });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'Todos'>('Todos');
  const [feedback, setFeedback] = useState('');
  const [searchingZip, setSearchingZip] = useState(false);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees
      .filter((employee) => statusFilter === 'Todos' || employee.status === statusFilter)
      .filter((employee) => {
        if (!query) return true;
        return [
          employee.registration,
          employee.name,
          employee.role,
          employee.manager,
          employee.gender,
          employee.education,
          employee.schedule,
          employee.modality,
          employee.zipCode,
          employee.street,
          employee.neighborhood,
          employee.city,
          employee.state,
          employee.status,
        ].join(' ').toLowerCase().includes(query);
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [employees, search, statusFilter]);

  const totals = useMemo(() => {
    const active = employees.filter((employee) => employee.status === 'Ativo').length;
    const admission = employees.filter((employee) => employee.status === 'Admissao').length;
    const dismissed = employees.filter((employee) => employee.status === 'Demitido').length;
    const averageAge = employees.length
      ? Math.round(employees.reduce((sum, employee) => sum + calculateAge(employee.birthDate), 0) / employees.length)
      : 0;
    return { active, admission, dismissed, averageAge };
  }, [employees]);

  const saveEmployee = () => {
    const normalizedRegistration = normalizeRegistration(form.registration);
    if (!normalizedRegistration || !form.name.trim() || !form.birthDate) {
      setFeedback('Preencha matricula, nome e data de nascimento antes de salvar.');
      return;
    }

    if (form.status === 'Demitido' && !form.dismissalDate) {
      setFeedback('Informe a data de demissao para funcionario demitido.');
      return;
    }

    const duplicated = employees.some((employee) => normalizeRegistration(employee.registration) === normalizedRegistration && employee.id !== editingId);
    if (duplicated) {
      setFeedback('Ja existe colaborador com essa matricula.');
      return;
    }

    const normalizedForm = form.status === 'Demitido' ? { ...form, registration: normalizedRegistration } : { ...form, registration: normalizedRegistration, dismissalDate: '' };

    if (editingId) {
      setEmployees((current) => current.map((employee) => (employee.id === editingId ? { id: editingId, ...normalizedForm } : employee)));
      setFeedback(`Colaborador atualizado: ${form.name}.`);
      setEditingId(null);
      setForm({ ...emptyForm, registration: nextRegistration(employees) });
      return;
    }

    const employee = { id: `colab-${Date.now()}`, ...normalizedForm };
    setEmployees((current) => [employee, ...current]);
    setFeedback(`Colaborador cadastrado: ${employee.name}.`);
    setForm({ ...emptyForm, registration: nextRegistration([employee, ...employees]) });
  };

  const editEmployee = (employee: Employee) => {
    setEditingId(employee.id);
    setForm({
      registration: employee.registration,
      name: employee.name,
      birthDate: employee.birthDate,
      role: employee.role,
      manager: employee.manager,
      admissionDate: employee.admissionDate,
      dismissalDate: employee.dismissalDate,
      gender: employee.gender,
      education: employee.education,
      schedule: employee.schedule,
      modality: employee.modality,
      salary: employee.salary,
      zipCode: employee.zipCode,
      street: employee.street,
      addressNumber: employee.addressNumber,
      complement: employee.complement,
      neighborhood: employee.neighborhood,
      city: employee.city,
      state: employee.state,
      status: employee.status,
    });
    setFeedback(`Editando cadastro de ${employee.name}.`);
  };

  const searchZipCode = async () => {
    const zip = form.zipCode.replace(/\D/g, '');
    if (zip.length !== 8) {
      setFeedback('Informe um CEP com 8 digitos para buscar o endereco.');
      return;
    }

    setSearchingZip(true);
    setFeedback('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
      if (!response.ok) throw new Error('CEP indisponivel');
      const data = await response.json();
      if (data.erro) throw new Error('CEP nao encontrado');
      setForm((current) => ({
        ...current,
        zipCode: zip,
        street: data.logradouro ?? '',
        neighborhood: data.bairro ?? '',
        city: data.localidade ?? '',
        state: data.uf ?? '',
      }));
      setFeedback('Endereco preenchido pelo CEP. Complete numero e complemento, se houver.');
    } catch {
      setFeedback('Nao foi possivel encontrar esse CEP. Preencha o endereco manualmente.');
    } finally {
      setSearchingZip(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ ...emptyForm, registration: nextRegistration(employees) });
    setFeedback('');
  };

  const deleteEmployee = (employee: Employee) => {
    const confirmed = window.confirm(`Excluir o cadastro de ${employee.name}?`);
    if (!confirmed) return;
    setEmployees((current) => current.filter((item) => item.id !== employee.id));
    if (editingId === employee.id) cancelEdit();
    setFeedback(`Cadastro excluido: ${employee.name}.`);
  };

  const cards = [
    { label: 'Colaboradores', value: String(employees.length), detail: `${filteredEmployees.length} no filtro atual`, icon: Users, tone: 'teal' },
    { label: 'Ativos', value: String(totals.active), detail: 'aptos para ponto', icon: BadgeCheck, tone: 'emerald' },
    { label: 'Em admissao', value: String(totals.admission), detail: `${totals.dismissed} demitido(s)`, icon: CalendarDays, tone: 'cyan' },
    { label: 'Idade media', value: `${totals.averageAge}`, detail: 'calculada por nascimento', icon: UserCheck, tone: 'amber' },
  ];

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="crystal-dark hero-crystal relative overflow-hidden rounded-[22px] px-7 py-7 text-white">
          <div className="absolute right-0 top-0 h-56 w-72 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.28),transparent_56%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="relative">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-cyan-200">
              <ClipboardList size={19} strokeWidth={1.8} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Cadastro completo de RH</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Colaboradores</h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-300">
              Ficha completa do funcionario com listas de cargo, gestor, escolaridade, escala, salario e dados de admissao/demissao.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="ops-card rounded-[18px] border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{card.label}</p>
                    <p className="mt-3 text-3xl font-black text-slate-950">{card.value}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{card.detail}</p>
                  </div>
                  <div className={`icon-chip icon-chip-${card.tone}`}>
                    <Icon size={16} strokeWidth={1.8} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[430px_1fr]">
          <aside className="ops-card rounded-[18px] border border-slate-200 bg-white p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Plus size={17} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-950">{editingId ? 'Alterar funcionario' : 'Novo funcionario'}</h2>
                <p className="text-xs font-semibold text-slate-500">Nome e nascimento sao digitados; o restante vem de listas da empresa.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Matricula" value={form.registration} onChange={(value) => setForm((current) => ({ ...current, registration: value.replace(/\D/g, '').slice(0, 6) }))} />
                <Field label="Nascimento" type="date" value={form.birthDate} onChange={(value) => setForm((current) => ({ ...current, birthDate: value }))} />
              </div>
              <div className="grid grid-cols-[1fr_92px] gap-3">
                <Field label="Nome completo" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
                <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Idade</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{form.birthDate ? calculateAge(form.birthDate) : '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Cargo" value={form.role} options={roleOptions} onChange={(value) => setForm((current) => ({ ...current, role: value }))} />
                <SelectField label="Gestor" value={form.manager} options={managerOptions} onChange={(value) => setForm((current) => ({ ...current, manager: value }))} />
                <Field label="Admissao" type="date" value={form.admissionDate} onChange={(value) => setForm((current) => ({ ...current, admissionDate: value }))} />
                <SelectField label="Sexo / genero" value={form.gender} options={genderOptions} onChange={(value) => setForm((current) => ({ ...current, gender: value }))} />
                <SelectField label="Escolaridade" value={form.education} options={educationOptions} onChange={(value) => setForm((current) => ({ ...current, education: value }))} />
                <SelectField label="Escala" value={form.schedule} options={scheduleOptions} onChange={(value) => setForm((current) => ({ ...current, schedule: value }))} />
                <SelectField label="Modalidade" value={form.modality} options={modalityOptions} onChange={(value) => setForm((current) => ({ ...current, modality: value }))} />
                <Field label="Salario" type="number" value={form.salary} onChange={(value) => setForm((current) => ({ ...current, salary: value }))} />
                <SelectField label="Status" value={form.status} options={['Ativo', 'Admissao', 'Afastado', 'Demitido']} onChange={(value) => setForm((current) => ({ ...current, status: value as EmployeeStatus }))} />
              </div>
              <p className="rounded-[14px] border border-slate-200 bg-slate-50 p-3 text-[11px] font-semibold leading-5 text-slate-600">
                Escala define jornada e descanso. Modalidade define onde o trabalho acontece.
              </p>

              {form.status === 'Demitido' ? (
                <Field label="Data de demissao" type="date" value={form.dismissalDate} onChange={(value) => setForm((current) => ({ ...current, dismissalDate: value }))} />
              ) : null}

              <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Endereco</p>
                <div className="grid grid-cols-[1fr_112px] gap-2">
                  <Field label="CEP" value={form.zipCode} onChange={(value) => setForm((current) => ({ ...current, zipCode: value.replace(/\D/g, '').slice(0, 8) }))} />
                  <button onClick={searchZipCode} disabled={searchingZip} className="mt-[21px] inline-flex h-11 items-center justify-center rounded-[14px] bg-[#07111f] px-3 text-xs font-black text-white disabled:opacity-60">
                    {searchingZip ? 'Buscando' : 'Buscar'}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="Rua" value={form.street} onChange={(value) => setForm((current) => ({ ...current, street: value }))} />
                  <Field label="Numero" value={form.addressNumber} onChange={(value) => setForm((current) => ({ ...current, addressNumber: value }))} />
                  <Field label="Bairro" value={form.neighborhood} onChange={(value) => setForm((current) => ({ ...current, neighborhood: value }))} />
                  <Field label="Complemento" value={form.complement} onChange={(value) => setForm((current) => ({ ...current, complement: value }))} />
                  <Field label="Cidade" value={form.city} onChange={(value) => setForm((current) => ({ ...current, city: value }))} />
                  <Field label="UF" value={form.state} onChange={(value) => setForm((current) => ({ ...current, state: value.toUpperCase().slice(0, 2) }))} />
                </div>
              </div>

              {feedback ? <p className="rounded-[14px] border border-teal-200 bg-teal-50 p-3 text-xs font-black text-teal-900">{feedback}</p> : null}

              <div className="flex gap-2">
                <button onClick={saveEmployee} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#07111f] px-4 text-xs font-black text-white shadow-[0_14px_30px_rgba(2,6,23,0.22)]">
                  <Save size={15} />
                  {editingId ? 'Atualizar cadastro' : 'Salvar funcionario'}
                </button>
                {editingId ? (
                  <button onClick={cancelEdit} className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-slate-300 bg-white text-slate-700 hover:border-slate-950">
                    <X size={15} />
                  </button>
                ) : null}
              </div>
            </div>
          </aside>

          <section className="ops-card overflow-hidden rounded-[18px] border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950">Lista de funcionarios</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">Base geral para ponto, folha, admissao e relatorios.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as EmployeeStatus | 'Todos')} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none">
                  <option>Todos</option>
                  <option>Ativo</option>
                  <option>Admissao</option>
                  <option>Afastado</option>
                  <option>Demitido</option>
                </select>
                <div className="flex h-10 min-w-[230px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                  <Search size={14} className="text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar funcionario" className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto px-5 py-4">
              <table className="w-full min-w-[1520px] text-left">
                <thead>
                  <tr className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    <th className="pb-3 pr-4">Matricula</th>
                    <th className="pb-3 pr-4">Nome</th>
                    <th className="pb-3 pr-4">Cargo</th>
                    <th className="pb-3 pr-4">Gestor</th>
                    <th className="pb-3 pr-4">Nascimento</th>
                    <th className="pb-3 pr-4">Idade</th>
                    <th className="pb-3 pr-4">Escolaridade</th>
                    <th className="pb-3 pr-4">Escala</th>
                    <th className="pb-3 pr-4">Modalidade</th>
                    <th className="pb-3 pr-4">Salario</th>
                    <th className="pb-3 pr-4">Endereco</th>
                    <th className="pb-3 pr-4">Cidade/UF</th>
                    <th className="pb-3 pr-4">Admissao</th>
                    <th className="pb-3 pr-4">Demissao</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/80">
                      <td className="py-3 pr-4 text-xs font-black text-slate-950">{employee.registration}</td>
                      <td className="py-3 pr-4 text-xs">
                        <p className="font-black text-slate-950">{employee.name}</p>
                        <p className="mt-0.5 font-semibold text-slate-500">{employee.gender}</p>
                      </td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{employee.role}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{employee.manager}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{formatDate(employee.birthDate)}</td>
                      <td className="py-3 pr-4 text-xs font-black text-slate-950">{calculateAge(employee.birthDate)}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{employee.education}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{employee.schedule}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{employee.modality}</td>
                      <td className="py-3 pr-4 text-xs font-black text-slate-950">{formatMoney(employee.salary)}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">
                        <p>{formatAddress(employee)}</p>
                        <p className="mt-0.5 text-slate-500">CEP {formatZip(employee.zipCode)}</p>
                      </td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{employee.city && employee.state ? `${employee.city}/${employee.state}` : '-'}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{formatDate(employee.admissionDate)}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{employee.dismissalDate ? formatDate(employee.dismissalDate) : '-'}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${statusClass(employee.status)}`}>
                          {employee.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => editEmployee(employee)} className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-700 transition hover:border-slate-950" title="Alterar funcionario">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteEmployee(employee)} className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-rose-200 bg-rose-50 text-rose-700 transition hover:border-rose-500" title="Excluir funcionario">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredEmployees.length ? (
                <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
                  Nenhum funcionario encontrado para o filtro atual.
                </div>
              ) : null}
            </div>
          </section>
        </section>
      </div>
    </ProtectedRoute>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="h-11 w-full rounded-[14px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-950" />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-[14px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-950">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function nextRegistration(employees: Employee[]) {
  const highest = employees.reduce((max, employee) => {
    const number = Number(normalizeRegistration(employee.registration));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  return String(highest + 1).padStart(6, '0');
}

function normalizeRegistration(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  return digits ? digits.padStart(6, '0') : '';
}

function calculateAge(date: string) {
  if (!date) return 0;
  const birth = new Date(`${date}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return Math.max(0, age);
}

function formatDate(date: string) {
  if (!date) return '-';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

function formatMoney(value: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function formatZip(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return value || '-';
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatAddress(employee: Employee) {
  const parts = [employee.street, employee.addressNumber].filter(Boolean);
  const main = parts.length ? parts.join(', ') : '-';
  return employee.neighborhood ? `${main} - ${employee.neighborhood}` : main;
}

function statusClass(status: EmployeeStatus) {
  if (status === 'Ativo') return 'bg-emerald-100 text-emerald-800';
  if (status === 'Admissao') return 'bg-cyan-100 text-cyan-800';
  if (status === 'Afastado') return 'bg-amber-100 text-amber-900';
  return 'bg-rose-100 text-rose-800';
}
