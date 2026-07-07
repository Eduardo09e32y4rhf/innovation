'use client';

import { useState } from 'react';
import Link from 'next/link';
import { notFound , useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Building2, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  DownloadCloud, 
  FileText, 
  Link as LinkIcon, 
  Search, 
  Settings2, 
  Users, 
  Activity,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

export default function TenantDashboardPage({ params }: { params: { companyId: string } }) {
  const routeParams = useParams();
  const tenant = routeParams?.tenant || '';

  const { user } = useAuth();
  const currentRole = user?.profile?.toUpperCase();
  
  // Apenas perfil DEV tem acesso
  if (currentRole !== 'DEV') {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-sm font-medium text-slate-500">Acesso negado. Apenas desenvolvedores (Super Admin) podem acessar esta página.</p>
      </div>
    );
  }

  // Abas
  const [activeTab, setActiveTab] = useState<'geral' | 'financeiro' | 'logs'>('geral');

  // Mocks
  const companyMock = {
    id: params.companyId,
    name: 'Innovation Rh',
    cnpj: '12.345.678/0001-99',
    email: 'contato@innovationrh.com.br',
    phone: '(11) 98765-4321',
    status: 'Ativa',
    plan: 'PRO',
  };

  const usageMock = {
    users: { current: 7, max: 100 },
    employees: { current: 8, max: 100 },
  };

  const invoicesMock = [
    { id: 1, issueDate: '01/07/2026', value: 'R$ 199,00', dueDate: '10/07/2026', status: 'Paga' },
    { id: 2, issueDate: '01/06/2026', value: 'R$ 199,00', dueDate: '10/06/2026', status: 'Paga' },
    { id: 3, issueDate: '01/05/2026', value: 'R$ 199,00', dueDate: '10/05/2026', status: 'Atrasada' },
  ];

  const logsMock = [
    { id: 1, date: 'Hoje, 10:30', action: 'Fatura de Julho gerada via Asaas', icon: CreditCard },
    { id: 2, date: 'Ontem, 15:45', action: 'Módulo de WhatsApp ativado pelo suporte', icon: Settings2 },
    { id: 3, date: '25/06/2026', action: 'Empresa atingiu limite de 100 funcionários', icon: Users },
  ];

  const calcProgress = (curr: number, max: number) => Math.min(100, Math.round((curr / max) * 100));

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-slate-950">{companyMock.name}</h1>
            <div className="flex gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                {companyMock.status}
              </span>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                Plano {companyMock.plan}
              </span>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">CNPJ: {companyMock.cnpj}</p>
        </div>
        
        <Link href={`/${tenant}/dashboard/platform`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2">
          <ArrowLeft size={14} /> Voltar para Empresas
        </Link>
      </header>

      {/* Tabs Nav */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {[
            { id: 'geral', label: 'Gestão Geral', icon: Building2 },
            { id: 'financeiro', label: 'Financeiro', icon: CreditCard },
            { id: 'logs', label: 'Histórico & Logs', icon: Activity },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  whitespace-nowrap flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors
                  ${isActive ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}
                `}
              >
                <tab.icon size={16} className={isActive ? 'text-slate-900' : 'text-slate-400'} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        
        {/* ABA: GESTÃO GERAL */}
        {activeTab === 'geral' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Informações Básicas */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FileText size={16} className="text-slate-500"/> Informações Básicas
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Razão Social</label>
                      <input type="text" readOnly value={companyMock.name} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">CNPJ</label>
                      <input type="text" readOnly value={companyMock.cnpj} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">E-mail de Contato</label>
                      <input type="email" readOnly value={companyMock.email} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Telefone</label>
                      <input type="text" readOnly value={companyMock.phone} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:outline-none" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Limites de Uso */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Activity size={16} className="text-slate-500"/> Limites de Uso (Plano {companyMock.plan})
                  </h3>
                </div>
                <div className="p-5 space-y-6 flex-1">
                  
                  {/* Progress Users */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700 flex items-center gap-2"><UserCheck size={16} className="text-slate-400"/> Usuários (Admins/Gestores)</span>
                      <span className="font-medium text-slate-500">{usageMock.users.current} / {usageMock.users.max}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${calcProgress(usageMock.users.current, usageMock.users.max)}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400 text-right">{calcProgress(usageMock.users.current, usageMock.users.max)}% utilizado</p>
                  </div>

                  {/* Progress Employees */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700 flex items-center gap-2"><Users size={16} className="text-slate-400"/> Funcionários (Baseados)</span>
                      <span className="font-medium text-slate-500">{usageMock.employees.current} / {usageMock.employees.max}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${calcProgress(usageMock.employees.current, usageMock.employees.max)}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400 text-right">{calcProgress(usageMock.employees.current, usageMock.employees.max)}% utilizado</p>
                  </div>

                </div>
              </section>
            </div>

            {/* Módulos */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Settings2 size={16} className="text-slate-500"/> Módulos Adicionais
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { name: 'Módulo de Ponto Eletrônico', desc: 'Permite controle de jornada e relatórios AFD/AFDT.', active: true },
                  { name: 'Integração WhatsApp', desc: 'Notificações de ponto e holerite via WhatsApp.', active: false },
                  { name: 'Reconhecimento Facial', desc: 'Validação biométrica no momento da batida de ponto.', active: true },
                ].map((mod, i) => (
                  <div key={i} className="flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">{mod.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{mod.desc}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" className="peer sr-only" defaultChecked={mod.active} />
                      <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-slate-900 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-slate-900 peer-focus:ring-offset-2"></div>
                    </label>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ABA: FINANCEIRO */}
        {activeTab === 'financeiro' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">MRR (Receita Recorrente)</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-slate-900">R$ 199,00</span>
                  <span className="text-sm font-medium text-slate-500 mb-1">/mês</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Status Financeiro</p>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={16} /> Em dia
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm flex items-center justify-center">
                <button className="w-full crystal-button inline-flex h-11 items-center justify-center gap-2 rounded-lg px-6 text-sm font-black text-white shadow-sm transition-transform active:scale-95">
                  <CreditCard size={16} /> Gerar Cobrança Avulsa
                </button>
              </div>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={16} className="text-slate-500"/> Últimas Faturas
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Emissão</th>
                      <th className="px-5 py-3 font-semibold">Valor</th>
                      <th className="px-5 py-3 font-semibold">Vencimento</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoicesMock.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-700">{inv.issueDate}</td>
                        <td className="px-5 py-4 font-bold text-slate-900">{inv.value}</td>
                        <td className="px-5 py-4 font-medium text-slate-700">{inv.dueDate}</td>
                        <td className="px-5 py-4">
                          {inv.status === 'Paga' ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                              {inv.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                              {inv.status}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {inv.status === 'Paga' ? (
                            <button className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors">
                              <DownloadCloud size={14} /> Baixar Recibo
                            </button>
                          ) : (
                            <button className="inline-flex items-center gap-1.5 rounded-md border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors">
                              <LinkIcon size={14} /> Copiar Link Pix
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ABA: HISTÓRICO E LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            
            {/* Search bar */}
            <div className="relative max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search size={16} className="text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Buscar atividades..." 
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            {/* Timeline */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 py-2">
                
                {logsMock.map((log, index) => (
                  <div key={log.id} className="relative pl-8">
                    {/* Icon bubble */}
                    <div className="absolute -left-[17px] flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-slate-100 shadow-sm">
                      <log.icon size={14} className="text-slate-500" />
                    </div>
                    
                    {/* Content */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{log.date}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-700">{log.action}</p>
                    </div>
                  </div>
                ))}

              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
