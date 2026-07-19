'use client';

import { useState } from 'react';
import { CreditCard, Database, MessageSquare, Shield, X } from 'lucide-react';
import { useQuery } from '@/app/hooks/use-data';
import { api, type PlatformCompany } from '@/app/lib/api';
import { normalizeDisplayName } from '@/app/lib/text';

export function safeIsoDate(val: any) {
  if (!val) return '';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

export function CompanyManageModal({ company, onClose, onSave, loading, error }: { company: PlatformCompany; onClose: () => void; onSave: (data: any) => void; loading: boolean; error: string | null }) {
  const [activeTab, setActiveTab] = useState<string>('plan');

  const plansData = useQuery(() => api.platform.listPlans(), []);
  const [name, setName] = useState(company.name || '');
  const [cnpj, setCnpj] = useState(company.document || '');
  const [maxUsers, setMaxUsers] = useState(company.maxUsers);
  const [maxEmployees, setMaxEmployees] = useState(company.maxEmployees ?? 1);
  const [plan, setPlan] = useState(company.platformPlanId || company.plan || 'FREE');
  const [billingStatus, setBillingStatus] = useState<'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PENDING_PAYMENT'>(company.billingStatus ?? 'TRIAL');
  const [trialEndsAt, setTrialEndsAt] = useState(safeIsoDate(company.trialEndsAt));
  const [activeModules, setActiveModules] = useState<string[]>(company.activeModules || ['employees', 'time-track', 'vacations', 'management', 'whatsapp']);
  const [asaasCustomerId, setAsaasCustomerId] = useState(company.asaasCustomerId || '');
  const [asaasSubscriptionId, setAsaasSubscriptionId] = useState(company.asaasSubscriptionId || '');
  const [internalNotes, setInternalNotes] = useState(company.internalNotes || '');

  const handleGeneratePdf = () => {
    const selectedPlan = plansData.data?.find(p => p.id === plan);
    if (!selectedPlan) return alert('Selecione um plano da plataforma primeiro.');
    
    const { buildPdfShell, infoGrid, section, signatureBlock, printPdf } = require('@/app/lib/pdf-utils');
    const pdfCompanyData = { 
      name: company.name, 
      document: company.document || 'N/A', 
      address: company.address || 'Não informado', 
      city: '', state: '' 
    };

    const objContent = '<p class="text-[11px] text-slate-700 text-justify mb-2">O presente contrato tem como objeto a licença de uso do software como serviço (SaaS) denominado "Innovation.ia", referente ao plano <strong>' + selectedPlan.name + '</strong>.<'+'/p>';
    const termsContent = '<p class="text-[11px] text-slate-700 text-justify mb-2">1. A CONTRATADA compromete-se a manter a plataforma acessível e funcional, ressalvadas as manutenções programadas.<'+'br><'+'br>2. Em caso de inadimplência (status: Inadimplente), o sistema suspenderá automaticamente o acesso aos módulos contratados, limitando o acesso a funções de administração até a regularização.<'+'br><'+'br>3. O suporte será prestado dentro do horário comercial e os SLAs obedecem a política de suporte estabelecida.<'+'/p>';
    const condGrid = infoGrid([
      { label: 'Plano', value: selectedPlan.name },
      { label: 'Valor', value: selectedPlan.isFree ? 'Gratuito' : 'R$ ' + parseFloat(String(selectedPlan.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' / ' + selectedPlan.cycle },
      { label: 'Max. Usuários', value: String(maxUsers) },
      { label: 'Max. Funcionários', value: String(maxEmployees) },
    ]);
    
    const html = buildPdfShell({ title: 'Contrato de Prestação de Serviços', subtitle: 'Innovation.ia Plataforma' }, pdfCompanyData, section('1. O Objeto', objContent) + section('2. Condições Comerciais', condGrid) + section('3. Termos Gerais', termsContent) + signatureBlock(['Innovation RH System', company.name]));
    
    printPdf(html, 'contrato-' + company.id + '.pdf');
  };

  const changed = 
    name !== (company.name || '') ||
    cnpj !== (company.document || '') ||
    maxUsers !== (company.maxUsers ?? 1) || 
    maxEmployees !== (company.maxEmployees ?? 1) || 
    plan !== (company.plan ?? 'FREE') || 
    billingStatus !== (company.billingStatus ?? 'TRIAL') || 
    trialEndsAt !== safeIsoDate(company.trialEndsAt) || 
    JSON.stringify(activeModules) !== JSON.stringify(company.activeModules || ['employees', 'time-track', 'vacations', 'management', 'whatsapp']) ||
    asaasCustomerId !== (company.asaasCustomerId || '') ||
    asaasSubscriptionId !== (company.asaasSubscriptionId || '') ||
    internalNotes !== (company.internalNotes || '');

  const valid = name.trim().length > 0 && maxUsers >= 1 && maxUsers >= company.usersCount && maxEmployees >= 1 && maxEmployees >= company.employeesCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-[12px] border border-slate-200 bg-white p-0 shadow-xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-black text-slate-950">Gerenciar {normalizeDisplayName(company.name)}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">Configurações, limites e financeiro</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        {/* TABS */}
        <div className="flex gap-6 border-b border-slate-100 px-6 pt-2 overflow-x-auto">
          {[
            { id: 'plan', label: 'Planos e Limites', icon: <Database size={14} /> },
            { id: 'permissions', label: 'Permissões', icon: <Shield size={14} /> },
            { id: 'finance', label: 'Financeiro', icon: <CreditCard size={14} /> },
            { id: 'crm', label: 'CRM / Notas', icon: <MessageSquare size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-xs font-bold transition-colors ${activeTab === t.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

          {/* Campos de Nome e CNPJ — sempre visíveis, independente da aba */}
          <div className="rounded-[10px] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Nome da Empresa <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Razão social ou nome fantasia"
                  className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500"
                />
                {name.trim().length === 0 && <p className="mt-1 text-[10px] font-semibold text-rose-600">Nome obrigatório</p>}
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">CNPJ</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {activeTab === 'plan' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[10px] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Usuários</label>
                  <span className="text-[10px] font-bold text-slate-400">{company.usersCount} em uso</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={Math.max(1, company.usersCount)} value={maxUsers} onChange={(e) => setMaxUsers(Math.max(1, Number(e.target.value) || 1))} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500" />
                </div>
                {maxUsers < company.usersCount && <p className="mt-1 text-[10px] font-semibold text-rose-600">Não pode ser menor que o atual ({company.usersCount})</p>}
              </div>

              <div className="rounded-[10px] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Funcionários</label>
                  <span className="text-[10px] font-bold text-slate-400">{company.employeesCount} em uso</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={Math.max(1, company.employeesCount)} value={maxEmployees} onChange={(e) => setMaxEmployees(Math.max(1, Number(e.target.value) || 1))} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500" />
                </div>
                {maxEmployees < company.employeesCount && <p className="mt-1 text-[10px] font-semibold text-rose-600">Não pode ser menor que o atual ({company.employeesCount})</p>}
              </div>

              <div className="sm:col-span-2 rounded-[10px] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Plano Ativo</label>
                    <select value={plan} onChange={(e) => setPlan(e.target.value)} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500 bg-white">
                      <option value="FREE">Free Trial / Nenhum</option>
                      {plansData.data?.map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.isHidden ? '(Uso Interno)' : ''} - {p.isFree ? 'FREE' : `R$ ${parseFloat(String(p.price || 0)).toFixed(2)}`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Status de Faturamento</label>
                    <select value={billingStatus} onChange={(e) => setBillingStatus(e.target.value as 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PENDING_PAYMENT')} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500 bg-white">
                      <option value="TRIAL">Em Teste (Trial)</option>
                      <option value="ACTIVE">Ativo</option>
                      <option value="PAST_DUE">Inadimplente</option>
                      <option value="CANCELED">Cancelado</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={handleGeneratePdf}
                    className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"
                  >
                    Gerar Contrato (PDF)
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="rounded-[10px] border border-slate-100 bg-white p-5 shadow-sm">
              <label className="mb-4 block text-[11px] font-black uppercase tracking-wider text-slate-500">Módulos Liberados</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'employees', label: 'Funcionários' },
                  { id: 'time-track', label: 'Controle de Ponto' },
                  { id: 'vacations', label: 'Gestão de Férias' },
                  { id: 'management', label: 'Painel de Gestão' },
                  { id: 'whatsapp', label: 'Integração WhatsApp' },
                ].map(mod => (
                  <label key={mod.id} className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700 p-2 rounded-[8px] hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600" checked={activeModules.includes(mod.id)} onChange={(e) => {
                      if (e.target.checked) setActiveModules(prev => [...prev, mod.id]);
                      else setActiveModules(prev => prev.filter(id => id !== mod.id));
                    }} />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-4">
              <div className="rounded-[10px] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0030B9] text-white">
                    <Database size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Integração Asaas</h4>
                    <p className="text-[11px] text-slate-500">Vincule a empresa ao cliente e assinatura do Asaas</p>
                  </div>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Customer ID (Asaas)</label>
                    <input type="text" placeholder="cus_00000..." value={asaasCustomerId} onChange={(e) => setAsaasCustomerId(e.target.value)} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-medium outline-none focus:border-teal-500 font-mono" />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Subscription ID (Asaas)</label>
                    <input type="text" placeholder="sub_00000..." value={asaasSubscriptionId} onChange={(e) => setAsaasSubscriptionId(e.target.value)} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-medium outline-none focus:border-teal-500 font-mono" />
                  </div>
                </div>

                {(asaasCustomerId || asaasSubscriptionId) && (
                  <div className="mt-4 flex gap-2">
                    {asaasCustomerId && (
                      <a href={`https://www.asaas.com/customer/view/${asaasCustomerId}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#0030B9] hover:underline">
                        Abrir Cliente no Asaas
                      </a>
                    )}
                    {asaasCustomerId && asaasSubscriptionId && <span className="text-slate-300">|</span>}
                    {asaasSubscriptionId && (
                      <a href={`https://www.asaas.com/subscription/view/${asaasSubscriptionId}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#0030B9] hover:underline">
                        Abrir Assinatura no Asaas
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'crm' && (
            <div className="rounded-[10px] border border-slate-100 bg-white p-5 shadow-sm flex flex-col h-full">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Anotações Internas (Somente DEV/COMERCIAL)</label>
              <textarea 
                value={internalNotes} 
                onChange={(e) => setInternalNotes(e.target.value)} 
                placeholder="Registre aqui o histórico de negociação, alinhamentos e observações técnicas sobre o cliente..."
                className="w-full flex-1 min-h-[160px] rounded-[8px] border border-slate-200 p-3 text-sm outline-none focus:border-teal-500 resize-y" 
              />
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-slate-100 p-6 bg-white rounded-b-[12px]">
          <div className="text-[11px]">
            {changed ? (
              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-[4px]">Alterações pendentes em abas</span>
            ) : (
              <span className="text-slate-400">Nenhuma alteração</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-outline h-9 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
            <button
              onClick={() => valid && changed && onSave({ 
                name,
                document: cnpj,
                maxUsers, 
                maxEmployees, 
                plan, 
                billingStatus, 
                trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : undefined, 
                activeModules, 
                asaasCustomerId, 
                asaasSubscriptionId, 
                internalNotes 
              })}
              disabled={!valid || !changed || loading}
              className="crystal-button h-9 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60"
            >
              {loading ? 'Salvando...' : 'Salvar Empresa'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
