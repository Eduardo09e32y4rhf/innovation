'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams , useParams } from 'next/navigation';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type ContractType, type CreateEmployeeInput, type DailyWorkload, type Employee, type EmployeeStatus, type WorkScale } from '@/app/lib/api';
import { normalizeDisplayName, maskCPF, maskCNPJ, maskCEP } from '@/app/lib/text';

const STATUS_OPTIONS: { value: EmployeeStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Férias' },
  { value: 'SUSPENDED', label: 'Afastado' },
  { value: 'TERMINATED', label: 'Desligado' },
];

const DEPARTMENT_OPTIONS = ['Diretoria', 'RH', 'Financeiro', 'Operação', 'Comercial', 'TI', 'Administrativo', 'Jurídico', 'Logística', 'Produção', 'Marketing', 'Engenharia', 'Vendas', 'Atendimento', 'Manutenção', 'Qualidade', 'Compras'];

const POSITION_OPTIONS = [
  // A
  'Advogado', 'Almoxarife', 'Analista Comercial', 'Analista Contábil', 'Analista de Cobrança',
  'Analista de Controladoria', 'Analista de Crédito', 'Analista de Custos', 'Analista de Dados',
  'Analista de Departamento Pessoal', 'Analista de Infraestrutura', 'Analista de Logística',
  'Analista de Recrutamento', 'Analista de RH', 'Analista de Segurança da Informação',
  'Analista de Sistemas', 'Analista de Suporte', 'Analista Administrativo', 'Analista Financeiro',
  'Analista Junior', 'Analista Jurídico', 'Analista Pleno', 'Analista Sênior',
  'Arquiteto de Software', 'Assistente Administrativo', 'Assistente Comercial',
  'Assistente de Escritório', 'Assistente de Logística', 'Assistente de RH',
  'Assistente Financeiro', 'Assistente Social', 'Auxiliar Administrativo', 'Auxiliar Contábil',
  'Auxiliar de Almoxarifado', 'Auxiliar de Cobrança', 'Auxiliar de Cozinha',
  'Auxiliar de Enfermagem', 'Auxiliar de Limpeza', 'Auxiliar de Logística',
  'Auxiliar de Produção', 'Auxiliar de RH', 'Auxiliar de TI', 'Auxiliar Financeiro',
  'Auxiliar Técnico',
  // B
  'Business Partner de RH',
  // C
  'C-Level', 'CEO', 'CFO', 'CHRO', 'Cientista de Dados', 'CMO', 'COO', 'Contador',
  'Consultor', 'Consultor de Vendas', 'Consultor Sênior', 'Coordenador Administrativo',
  'Coordenador de Logística', 'Coordenador de RH', 'Copeiro', 'Cozinheiro', 'CTO',
  // D
  'Dentista', 'Desenvolvedor Junior', 'Desenvolvedor Pleno', 'Desenvolvedor Sênior',
  'DevOps', 'Diretor Administrativo', 'Diretor Comercial', 'Diretor de RH',
  'Diretor Financeiro',
  // E
  'Enfermeiro', 'Engenheiro Civil', 'Engenheiro de Produção',
  'Engenheiro de Segurança do Trabalho', 'Engenheiro Elétrico', 'Engenheiro Mecânico',
  'Especialista', 'Estagiário', 'Estagiário de Direito',
  // F
  'Farmacêutico', 'Faxineiro', 'Fisioterapeuta',
  // G
  'Garçom', 'Gerente Administrativo', 'Gerente Comercial', 'Gerente de Operações',
  'Gerente de RH', 'Gerente de TI', 'Gerente Financeiro', 'Gerente Jurídico',
  'Gerente Sênior',
  // H
  'Head',
  // J
  'Jovem Aprendiz',
  // L
  'Líder Técnico',
  // M
  'Médico', 'Motorista', 'Motorista Entregador', 'Motoboy',
  // N
  'Nutricionista',
  // O
  'Office Boy', 'Operador de Empilhadeira', 'Operador de Produção',
  // P
  'Porteiro', 'Presidente', 'Promotor de Vendas', 'Psicólogo',
  // R
  'Recepcionista', 'Representante Comercial',
  // S
  'Secretária Executiva', 'Sócio', 'Supervisor de Logística', 'Supervisor de Vendas',
  // T
  'Tech Lead', 'Técnico de Enfermagem', 'Técnico de Segurança do Trabalho',
  'Técnico em Edificações', 'Técnico em Eletrotécnica', 'Técnico em Mecânica',
  'Tesoureiro', 'Trainee',
  // V
  'Vendedor Externo', 'Vendedor Interno', 'Vigilante',
  // VP
  'VP',
].sort((a, b) => a.localeCompare(b, 'pt-BR'));

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
const GENDER_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMININO', label: 'Feminino' },
  { value: 'OUTRO', label: 'Outro' },
];
const MARITAL_STATUS_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'SOLTEIRO', label: 'Solteiro(a)' },
  { value: 'CASADO', label: 'Casado(a)' },
  { value: 'DIVORCIADO', label: 'Divorciado(a)' },
  { value: 'VIUVO', label: 'Viúvo(a)' },
  { value: 'UNIAO_ESTAVEL', label: 'União Estável' },
];
const EDUCATION_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'Analfabeto', label: 'Analfabeto' },
  { value: 'Até o 5º ano incompleto do Ensino Fundamental', label: 'Até o 5º ano incompleto do Ensino Fundamental' },
  { value: '5º ano completo do Ensino Fundamental', label: '5º ano completo do Ensino Fundamental' },
  { value: 'Do 6º ao 9º ano incompleto do Ensino Fundamental', label: 'Do 6º ao 9º ano incompleto do Ensino Fundamental' },
  { value: 'Ensino Fundamental Completo', label: 'Ensino Fundamental Completo' },
  { value: 'Ensino Médio Incompleto', label: 'Ensino Médio Incompleto' },
  { value: 'Ensino Médio Completo', label: 'Ensino Médio Completo' },
  { value: 'Educação Superior Incompleta', label: 'Educação Superior Incompleta' },
  { value: 'Educação Superior Completa', label: 'Educação Superior Completa' },
  { value: 'Pós-Graduação Incompleta', label: 'Pós-Graduação Incompleta' },
  { value: 'Pós-Graduação Completa', label: 'Pós-Graduação Completa' },
  { value: 'Mestrado Completo', label: 'Mestrado Completo' },
  { value: 'Doutorado Completo', label: 'Doutorado Completo' },
];
const BANK_ACCOUNT_TYPE_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'CORRENTE', label: 'Conta Corrente' },
  { value: 'POUPANCA', label: 'Conta Poupança' },
];
const PARENTESCO_OPTIONS = [
  { value: 'Filho', label: 'Filho' },
  { value: 'Filha', label: 'Filha' },
  { value: 'Enteado', label: 'Enteado' },
  { value: 'Enteada', label: 'Enteada' },
  { value: 'Cônjuge', label: 'Cônjuge' },
  { value: 'Companheiro', label: 'Companheiro' },
  { value: 'Companheira', label: 'Companheira' },
  { value: 'Pai', label: 'Pai' },
  { value: 'Mãe', label: 'Mãe' },
  { value: 'Outro', label: 'Outro' },
];

const TABS = ['Dados pessoais', 'Documentos', 'Endereco', 'Dados profissionais', 'Jornada', 'Dados bancários', 'Dependentes', 'Contrato e acesso'] as const;

type TabName = (typeof TABS)[number];

interface Dependent {
  nome: string;
  cpf: string;
  dataNascimento: string;
  parentesco: string;
}

type EmployeeFormState = CreateEmployeeInput & {
  accessEnabled: 'NO' | 'YES';
  accessProfile: 'FUNCIONARIO' | 'GESTOR' | 'RH' | 'ADMIN' | 'CONSULTA';
};

const EMPTY: EmployeeFormState = {
  name: '', cpf: '', email: '', phone: '', secondaryPhone: '', birthDate: '', registration: '',
  rg: '', rgIssuer: '', rgState: '', rgIssueDate: '',
  gender: '', maritalStatus: '', education: '', motherName: '', fatherName: '',
  nationality: 'Brasileira', birthplace: '',
  pis: '', firstJob: false,
  voterTitle: '', voterZone: '', voterSection: '', voterState: '',
  reservista: '',
  cep: '', street: '', streetNumber: '', addressComplement: '', neighborhood: '', city: '', state: '', observations: '',
  position: 'Assistente Administrativo', department: 'Operação', managerId: '',
  admissionDate: '', terminationDate: '', status: 'ACTIVE', unit: 'Matriz',
  salary: undefined, contractType: 'CLT', cnpj: '', legalName: '', tradeName: '',
  workScale: '5X2', customWorkScale: '', dailyWorkload: '08:00',
  standardEntry: '', standardLunchStart: '', standardLunchReturn: '', standardExit: '',
  bankName: '', bankAgency: '', bankAccount: '', bankAccountType: '',
  dependents: '',
  accessEnabled: 'NO', accessProfile: 'FUNCIONARIO',
};

export default function NewEmployeePage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full py-16 text-center text-sm text-slate-500">Carregando...</div>}>
      <EmployeeForm />
    </Suspense>
  );
}

function EmployeeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeParams = useParams();
  const tenant = routeParams?.tenant as string;
  const editId = searchParams.get('id');
  const isEdit = Boolean(editId);
  const employeesQuery = useQuery(() => api.employees.list(), []);

  const [form, setForm] = useState<EmployeeFormState>(EMPTY);
  const [activeTab, setActiveTab] = useState<TabName>('Dados pessoais');
  const [loadingEmployee, setLoadingEmployee] = useState(isEdit);
  const [dependentsList, setDependentsList] = useState<Dependent[]>([]);

  async function fetchCnpj(cnpj: string) {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          legalName: data.razao_social || prev.legalName,
          tradeName: data.nome_fantasia || prev.tradeName,
        }));
      }
    } catch {
      // Ignore API errors
    }
  }

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
          rg: emp.rg ?? '',
          rgIssuer: emp.rgIssuer ?? '',
          rgState: emp.rgState ?? '',
          rgIssueDate: dateInput(emp.rgIssueDate),
          secondaryPhone: emp.secondaryPhone ?? '',
          gender: emp.gender ?? '',
          maritalStatus: emp.maritalStatus ?? '',
          education: emp.education ?? '',
          motherName: emp.motherName ?? '',
          fatherName: emp.fatherName ?? '',
          nationality: emp.nationality ?? 'Brasileira',
          birthplace: emp.birthplace ?? '',
          pis: emp.pis ?? '',
          firstJob: emp.firstJob ?? false,
          voterTitle: emp.voterTitle ?? '',
          voterZone: emp.voterZone ?? '',
          voterSection: emp.voterSection ?? '',
          voterState: emp.voterState ?? '',
          reservista: emp.reservista ?? '',
          cep: emp.cep ?? '',
          street: emp.street ?? '',
          streetNumber: emp.streetNumber ?? '',
          addressComplement: emp.addressComplement ?? '',
          neighborhood: emp.neighborhood ?? '',
          city: emp.city ?? '',
          state: emp.state ?? '',
          observations: emp.observations ?? '',
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
          bankName: emp.bankName ?? '',
          bankAgency: emp.bankAgency ?? '',
          bankAccount: emp.bankAccount ?? '',
          bankAccountType: emp.bankAccountType ?? '',
          dependents: emp.dependents ?? '',
          accessEnabled: emp.userId ? 'YES' : 'NO',
          accessProfile: (emp.user?.role === 'ADMIN' || emp.user?.role === 'RH' || emp.user?.role === 'GESTOR' || emp.user?.role === 'CONSULTA' || emp.user?.role === 'FUNCIONARIO') ? emp.user.role : 'FUNCIONARIO',
        });
        if (emp.dependents) {
          try {
            const parsed = JSON.parse(emp.dependents);
            if (Array.isArray(parsed)) setDependentsList(parsed);
          } catch { /* ignore */ }
        }
      })
      .catch(() => {})
      .finally(() => active && setLoadingEmployee(false));
    return () => {
      active = false;
    };
  }, [editId]);

  const managerOptions = useMemo(() => {
    return (employeesQuery.data ?? []).filter((employee) => {
      if (employee.id === editId || employee.status === 'TERMINATED') return false;
      const p = (employee.position || '').toLowerCase();
      const isManagerPosition = p.includes('gerente') || p.includes('diretor') || p.includes('supervisor') || p.includes('coordenador') || p.includes('líder') || p.includes('lider') || p.includes('head') || p.includes('ceo') || p.includes('superintendente') || p.includes('sócio') || p.includes('socio');
      const isManagerRole = employee.user?.role === 'GESTOR' || employee.user?.role === 'ADMIN' || employee.user?.role === 'RH';
      return isManagerPosition || isManagerRole;
    });
  }, [employeesQuery.data, editId]);

  const handleCepChange = async (val: string) => {
    const masked = maskCEP(val);
    set('cep', masked);
    const raw = masked.replace(/\D/g, '');
    if (raw.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await res.json();
        if (!data.erro) {
          set('street', data.logradouro || '');
          set('neighborhood', data.bairro || '');
          set('city', data.localidade || '');
          set('state', data.uf || '');
        }
      } catch (e) {}
    }
  };

  const save = useMutation(
    (payload: CreateEmployeeInput) =>
      isEdit && editId ? api.employees.update(editId, payload) : api.employees.create(payload),
    { onSuccess: () => router.push(`/${tenant}/dashboard/employees`) },
  );

  function set<K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addDependent() {
    setDependentsList((prev) => [...prev, { nome: '', cpf: '', dataNascimento: '', parentesco: 'Filho' }]);
  }

  function removeDependent(index: number) {
    setDependentsList((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDependent(index: number, field: keyof Dependent, value: string) {
    setDependentsList((prev) => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  }

  async function handleSubmit() {
    const payload: CreateEmployeeInput = compactPayload({
      name: form.name,
      cpf: form.cpf,
      email: form.email,
      phone: form.phone,
      rg: form.rg,
      rgIssuer: form.rgIssuer,
      rgState: form.rgState,
      rgIssueDate: isoDate(form.rgIssueDate),
      secondaryPhone: form.secondaryPhone,
      gender: form.gender,
      maritalStatus: form.maritalStatus,
      education: form.education,
      motherName: form.motherName,
      fatherName: form.fatherName,
      nationality: form.nationality,
      birthplace: form.birthplace,
      pis: form.pis,
      firstJob: form.firstJob,
      voterTitle: form.voterTitle,
      voterZone: form.voterZone,
      voterSection: form.voterSection,
      voterState: form.voterState,
      reservista: form.reservista,
      cep: form.cep,
      street: form.street,
      streetNumber: form.streetNumber,
      addressComplement: form.addressComplement,
      neighborhood: form.neighborhood,
      city: form.city,
      state: form.state,
      observations: form.observations,
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
      bankName: form.bankName,
      bankAgency: form.bankAgency,
      bankAccount: form.bankAccount,
      bankAccountType: form.bankAccountType,
      dependents: dependentsList.length > 0 ? JSON.stringify(dependentsList) : undefined,
      accessEnabled: form.accessEnabled,
      accessProfile: form.accessProfile,
    });
    try {
      await save.mutate(payload);
    } catch {
      /* erro exibido via save.error */
    }
  }

  if (loadingEmployee) {
    return <div className="mx-auto w-full py-16 text-center text-sm text-slate-500">Carregando funcionário...</div>;
  }

  return (
    <div className="mx-auto w-full space-y-4">
      <header className="flex items-center gap-3">
        <Link href={`/${tenant}/dashboard/employees`} className="btn-icon rounded-[6px]">
          <ArrowLeft size={15} />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">Funcionários</p>
          <h2 className="text-xl font-black text-slate-950">{isEdit ? 'Editar colaborador' : 'Novo colaborador'}</h2>
        </div>
      </header>

      {save.error && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{save.error}</p>
      )}

      <section className="ops-card rounded-[8px] border border-slate-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap gap-2 pb-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`h-8 shrink-0 rounded-[6px] px-3 text-[11px] font-black ${activeTab === tab ? 'bg-slate-950 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── DADOS PESSOAIS ── */}
        {activeTab === 'Dados pessoais' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo" value={form.name} onChange={(v) => set('name', v)} required />
            <Field label="CPF" value={form.cpf ?? ''} onChange={(v) => set('cpf', maskCPF(v))} placeholder="000.000.000-00" />
            <Field label="Data de nascimento" type="date" value={form.birthDate ?? ''} onChange={(v) => set('birthDate', v)} />
            <Field label="E-mail" type="email" value={form.email ?? ''} onChange={(v) => set('email', v)} />
            <Field label="Data de admissão" type="date" value={form.admissionDate ?? ''} onChange={(v) => set('admissionDate', v)} />
            <Field label="Telefone" value={form.phone ?? ''} onChange={(v) => set('phone', v)} placeholder="+55 11 90000-0000" />
            <Field label="Telefone Secundário" value={form.secondaryPhone ?? ''} onChange={(v) => set('secondaryPhone', v)} placeholder="+55 11 90000-0000" />
            <Field label="Matrícula" value={form.registration ?? ''} onChange={(v) => set('registration', v)} placeholder="EMP-0001" />
            <Select label="Gênero" value={form.gender ?? ''} onChange={(v) => set('gender', v)} options={GENDER_OPTIONS} />
            <Select label="Estado Civil" value={form.maritalStatus ?? ''} onChange={(v) => set('maritalStatus', v)} options={MARITAL_STATUS_OPTIONS} />
            <Select label="Escolaridade" value={form.education ?? ''} onChange={(v) => set('education', v)} options={EDUCATION_OPTIONS} />
            <Field label="Nome da Mãe" value={form.motherName ?? ''} onChange={(v) => set('motherName', v)} />
            <Field label="Nome do Pai" value={form.fatherName ?? ''} onChange={(v) => set('fatherName', v)} />
            <Field label="Naturalidade / Cidade natal" value={form.birthplace ?? ''} onChange={(v) => set('birthplace', v)} />
            <Field label="Nacionalidade" value={form.nationality ?? 'Brasileira'} onChange={(v) => set('nationality', v)} />
          </div>
        )}

        {/* ── DOCUMENTOS ── */}
        {activeTab === 'Documentos' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={form.firstJob ?? false}
                  onChange={(e) => set('firstJob', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600"
                />
                <span>Primeiro emprego</span>
              </label>
              {form.firstJob && (
                <p className="mt-1 rounded-[6px] border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs text-teal-700 font-semibold">
                  O RH irá providenciar o PIS
                </p>
              )}
            </div>
            {!form.firstJob && (
              <Field label="PIS / PASEP / NIT" value={form.pis ?? ''} onChange={(v) => set('pis', v)} placeholder="000.00000.00-0" />
            )}
            <Field label="RG" value={form.rg ?? ''} onChange={(v) => set('rg', v)} />
            <Field label="Órgão Emissor" value={form.rgIssuer ?? ''} onChange={(v) => set('rgIssuer', v)} placeholder="SSP" />
            <Field label="UF Emissão RG" value={form.rgState ?? ''} onChange={(v) => set('rgState', v)} placeholder="SP" />
            <Field label="Data Emissão RG" type="date" value={form.rgIssueDate ?? ''} onChange={(v) => set('rgIssueDate', v)} />
            <p className="sm:col-span-2 text-[10px] font-black uppercase tracking-widest text-slate-400 pt-2">Título de Eleitor</p>
            <Field label="Número" value={form.voterTitle ?? ''} onChange={(v) => set('voterTitle', v)} />
            <Field label="Zona" value={form.voterZone ?? ''} onChange={(v) => set('voterZone', v)} />
            <Field label="Seção" value={form.voterSection ?? ''} onChange={(v) => set('voterSection', v)} />
            <Field label="UF" value={form.voterState ?? ''} onChange={(v) => set('voterState', v)} placeholder="SP" />
            {form.gender === 'MASCULINO' && (
              <Field label="Reservista / Militar" value={form.reservista ?? ''} onChange={(v) => set('reservista', v)} />
            )}
          </div>
        )}

        {/* ── ENDEREÇO ── */}
        {activeTab === 'Endereco' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CEP" value={form.cep ?? ''} onChange={handleCepChange} placeholder="00000-000" />
            <Field label="Logradouro" value={form.street ?? ''} onChange={(v) => set('street', v)} />
            <Field label="Numero" value={form.streetNumber ?? ''} onChange={(v) => set('streetNumber', v)} />
            <Field label="Complemento" value={form.addressComplement ?? ''} onChange={(v) => set('addressComplement', v)} />
            <Field label="Bairro" value={form.neighborhood ?? ''} onChange={(v) => set('neighborhood', v)} />
            <Field label="Cidade" value={form.city ?? ''} onChange={(v) => set('city', v)} />
            <Field label="Estado" value={form.state ?? ''} onChange={(v) => set('state', v)} />
            <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2">
              <span>Observacoes cadastrais</span>
              <textarea value={form.observations ?? ''} onChange={(e) => set('observations', e.target.value)} className="min-h-20 w-full rounded-[6px] border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-teal-500" />
            </label>
          </div>
        )}

        {/* ── DADOS PROFISSIONAIS ── */}
        {activeTab === 'Dados profissionais' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Data de admissão" type="date" value={form.admissionDate} onChange={(v) => set('admissionDate', v)} required />
            <Select label="Status" value={form.status ?? 'ACTIVE'} onChange={(v) => set('status', v as EmployeeStatus)} options={STATUS_OPTIONS} />
            {form.status === 'TERMINATED' && <Field label="Data de demissão" type="date" value={form.terminationDate ?? ''} onChange={(v) => set('terminationDate', v)} />}
            <Select label="Departamento" value={form.department} onChange={(v) => set('department', v)} options={DEPARTMENT_OPTIONS.map((value) => ({ value, label: value }))} />
            <Select label="Cargo" value={form.position} onChange={(v) => set('position', v)} options={POSITION_OPTIONS.map((value) => ({ value, label: value }))} />
            <ManagerSelect employees={managerOptions} value={form.managerId ?? ''} onChange={(v) => set('managerId', v)} loading={employeesQuery.loading} />
            <Select label="Operação / unidade" value={form.unit ?? 'Matriz'} onChange={(v) => set('unit', v)} options={UNIT_OPTIONS.map((value) => ({ value, label: value }))} />
          </div>
        )}

        {/* ── JORNADA ── */}
        {activeTab === 'Jornada' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Escala" value={form.workScale ?? '5X2'} onChange={(v) => set('workScale', v as WorkScale)} options={WORK_SCALE_OPTIONS} />
            {form.workScale === 'OUTRO' && <Field label="Descrição da escala" value={form.customWorkScale ?? ''} onChange={(v) => set('customWorkScale', v)} />}
            <Select label="Jornada diária padrão" value={form.dailyWorkload ?? '08:00'} onChange={(v) => set('dailyWorkload', v as DailyWorkload)} options={DAILY_WORKLOAD_OPTIONS} />
            <Field label="Entrada padrão" type="time" value={form.standardEntry ?? ''} onChange={(v) => set('standardEntry', v)} />
            <Field label="Saída almoço" type="time" value={form.standardLunchStart ?? ''} onChange={(v) => set('standardLunchStart', v)} />
            <Field label="Retorno almoço" type="time" value={form.standardLunchReturn ?? ''} onChange={(v) => set('standardLunchReturn', v)} />
            <Field label="Saída padrão" type="time" value={form.standardExit ?? ''} onChange={(v) => set('standardExit', v)} />
          </div>
        )}

        {/* ── DADOS BANCÁRIOS ── */}
        {activeTab === 'Dados bancários' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Banco" value={form.bankName ?? ''} onChange={(v) => set('bankName', v)} placeholder="001 - Banco do Brasil" />
            <Field label="Agência" value={form.bankAgency ?? ''} onChange={(v) => set('bankAgency', v)} placeholder="0001-2" />
            <Field label="Conta" value={form.bankAccount ?? ''} onChange={(v) => set('bankAccount', v)} placeholder="00000-0" />
            <Select label="Tipo de Conta" value={form.bankAccountType ?? ''} onChange={(v) => set('bankAccountType', v)} options={BANK_ACCOUNT_TYPE_OPTIONS} />
          </div>
        )}

        {/* ── DEPENDENTES ── */}
        {activeTab === 'Dependentes' && (
          <div className="space-y-4">
            {dependentsList.length === 0 && (
              <p className="rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500 text-center">
                Nenhum dependente cadastrado.
              </p>
            )}
            {dependentsList.map((dep, index) => (
              <div key={index} className="relative rounded-[8px] border border-slate-200 bg-slate-50 p-4">
                <button
                  type="button"
                  onClick={() => removeDependent(index)}
                  className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-rose-200 bg-white text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 size={13} />
                </button>
                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Dependente {index + 1}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nome" value={dep.nome} onChange={(v) => updateDependent(index, 'nome', v)} />
                  <Field label="CPF" value={dep.cpf} onChange={(v) => updateDependent(index, 'cpf', v)} placeholder="000.000.000-00" />
                  <Field label="Data de Nascimento" type="date" value={dep.dataNascimento} onChange={(v) => updateDependent(index, 'dataNascimento', v)} />
                  <Select label="Parentesco" value={dep.parentesco} onChange={(v) => updateDependent(index, 'parentesco', v)} options={PARENTESCO_OPTIONS} />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addDependent}
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-dashed border-teal-400 bg-teal-50 px-4 text-xs font-bold text-teal-700 hover:bg-teal-100"
            >
              <Plus size={14} />
              Adicionar dependente
            </button>
          </div>
        )}

        {/* ── CONTRATO E ACESSO ── */}
        {activeTab === 'Contrato e acesso' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Salário (R$)" type="number" value={form.salary?.toString() ?? ''} onChange={(v) => set('salary', v ? Number(v) : undefined)} />
            <Select label="Tipo de contrato" value={form.contractType ?? 'CLT'} onChange={(v) => set('contractType', v as ContractType)} options={CONTRACT_OPTIONS} />
            {(form.contractType === 'PJ' || form.contractType === 'TERCEIRIZADO') && (
              <Field
                label={form.contractType === 'PJ' ? 'CNPJ' : 'CNPJ da empresa terceira'}
                value={form.cnpj ?? ''}
                onChange={(v) => {
                  const masked = maskCNPJ(v);
                  set('cnpj', masked);
                  if (masked.replace(/\D/g, '').length === 14) fetchCnpj(masked);
                }}
                placeholder="00.000.000/0000-00"
              />
            )}
            {form.contractType === 'PJ' && (
              <>
                <Field label="Razão social" value={form.legalName ?? ''} onChange={(v) => set('legalName', v)} />
                <Field label="Nome fantasia" value={form.tradeName ?? ''} onChange={(v) => set('tradeName', v)} />
              </>
            )}
            <Select label="Permitir acesso ao painel" value={form.accessEnabled} onChange={(v) => set('accessEnabled', v as 'NO' | 'YES')} options={[{ value: 'NO', label: 'Não' }, { value: 'YES', label: 'Sim' }]} />
            <Select label="Perfil de acesso" value={form.accessProfile} onChange={(v) => set('accessProfile', v as EmployeeFormState['accessProfile'])} options={[{ value: 'FUNCIONARIO', label: 'Funcionário' }, { value: 'GESTOR', label: 'Gestor' }, { value: 'RH', label: 'RH' }, { value: 'ADMIN', label: 'Administrador' }, { value: 'CONSULTA', label: 'Consulta' }]} />
            <p className="sm:col-span-2 rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
              O acesso ao painel será ligado ao módulo de usuários. Este cadastro já deixa os dados do colaborador prontos para vínculo.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link href={`/${tenant}/dashboard/employees`} className="btn-outline inline-flex h-9 items-center justify-center rounded-[6px] px-3 text-[11px] font-bold text-slate-600 hover:text-black">Cancelar</Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={save.loading}
            className="crystal-button inline-flex h-9 items-center justify-center gap-2 rounded-[6px] px-3 text-[11px] font-black text-white disabled:opacity-60"
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