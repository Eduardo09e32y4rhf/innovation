'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  ExternalLink, 
  CreditCard,
  Building2,
  CalendarDays,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { request, PlatformCompany } from '@/app/lib/api';
import { EmptyState, LoadingState } from '@/app/components/data-states';

export default function SubscriptionsPage({ params: { tenant } }: { params: { tenant: string } }) {
  const [items, setItems] = useState<PlatformCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await request<PlatformCompany[]>('/platform/companies');
      setItems(data || []);
    } catch (e: any) {
      setError(e.message || 'Não foi possível carregar as assinaturas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    void load(); 
  }, []);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.document && c.document.includes(q))
    );
  }, [items, search]);

  const stats = useMemo(() => {
    let active = 0;
    let trial = 0;
    let overdue = 0;
    
    items.forEach(c => {
      const status = c.subscription?.status || c.billingStatus;
      if (status === 'ACTIVE') active++;
      else if (status === 'TRIAL') trial++;
      else if (status === 'OVERDUE' || status === 'PAST_DUE') overdue++;
    });
    
    return { active, trial, overdue, total: items.length };
  }, [items]);

  return (
    <div className="mx-auto w-full space-y-6 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">Gestão Asaas</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Assinaturas</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Acompanhe as assinaturas integradas com o Asaas e controle os pagamentos recorrentes.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin text-slate-400' : 'text-slate-500'} /> 
            Atualizar
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total de Empresas', value: stats.total, icon: Building2, tone: 'bg-slate-950 text-white' },
          { label: 'Assinaturas Ativas', value: stats.active, icon: ShieldCheck, tone: 'bg-teal-600 text-white' },
          { label: 'Em Período de Teste', value: stats.trial, icon: CalendarDays, tone: 'bg-amber-500 text-white' },
          { label: 'Inadimplentes', value: stats.overdue, icon: CreditCard, tone: 'bg-rose-600 text-white' },
        ].map((stat, i) => (
          <div key={i} className={\`flex items-center gap-4 rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm\`}>
            <div className={\`flex h-12 w-12 items-center justify-center rounded-xl \${stat.tone} shadow-inner\`}>
              <stat.icon size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{stat.label}</p>
              <p className="mt-0.5 text-2xl font-black tracking-tight text-slate-950">{stat.value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por empresa ou CNPJ..."
              className="h-10 w-full rounded-[8px] border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-10">
            <div className="mx-auto max-w-sm rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
              <p className="font-bold text-rose-800">Erro ao carregar assinaturas</p>
              <p className="mt-2 text-sm">{error}</p>
              <button onClick={load} className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700">Tentar novamente</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-10"><LoadingState label="Carregando empresas e assinaturas..." /></div>
        ) : !filteredItems.length && !error ? (
          <div className="p-10"><EmptyState message="Nenhuma empresa ou assinatura encontrada." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3">Empresa</th>
                  <th className="px-4 py-3">Plano & Licenças</th>
                  <th className="px-4 py-3">Status Assinatura</th>
                  <th className="px-4 py-3">Integração Asaas</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{item.name}</p>
                          <p className="mt-0.5 text-[10px] font-medium text-slate-400">{item.document || 'Sem CNPJ'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-bold text-slate-700">{item.platformPlan?.name || 'Sem Plano'}</p>
                      <p className="mt-1 text-[10px] font-medium text-slate-500">{item.subscription?.seatQuantity ?? item.usersCount ?? 0} usuários</p>
                    </td>
                    <td className="px-4 py-4">
                      {(() => {
                        const s = item.subscription?.status || item.billingStatus || 'INATIVO';
                        const isOk = s === 'ACTIVE';
                        const isWarn = s === 'TRIAL' || s === 'PENDING_PAYMENT';
                        return (
                          <span className={\`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black \${
                            isOk ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                            isWarn ? 'border-amber-200 bg-amber-50 text-amber-700' :
                            'border-rose-200 bg-rose-50 text-rose-700'
                          }\`}>
                            {s}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4">
                      {item.asaasSubscriptionId || item.asaasCustomerId ? (
                        <div className="flex flex-col gap-1 text-[10px]">
                          {item.asaasSubscriptionId && <span className="font-bold text-teal-700">Sub: <span className="font-mono">{item.asaasSubscriptionId}</span></span>}
                          {item.asaasCustomerId && <span className="text-slate-500">Cus: <span className="font-mono">{item.asaasCustomerId}</span></span>}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">Local (Não integrado)</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-bold text-slate-600">
                        {item.subscription?.nextDueDate 
                          ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(item.subscription.nextDueDate))
                          : item.trialEndsAt 
                            ? \`Teste até \${new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(item.trialEndsAt))}\`
                            : '—'
                        }
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {item.asaasCustomerId && (
                          <a 
                            href={\`https://www.asaas.com/customer/view/\${item.asaasCustomerId}\`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[10px] font-bold text-slate-600 hover:bg-white hover:text-teal-700 shadow-sm"
                          >
                            <ExternalLink size={12} />
                            Ver no Asaas
                          </a>
                        )}
                        {!item.asaasCustomerId && (
                          <Link 
                            href={\`/\${tenant}/dashboard/platform/companies?search=\${encodeURIComponent(item.name)}\`}
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50 shadow-sm"
                          >
                            <Building2 size={12} />
                            Acessar
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
