'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Check, Eye, EyeOff, Search, ShieldCheck } from 'lucide-react';
import { ErrorState, LoadingState, EmptyState } from '@/app/components/data-states';
import { useMutation, useQuery } from '../../_components/use-platform-query';
import { request } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { useConfirm } from '@/app/components/ui/confirm-provider';
import { platformLinks } from '../../_lib/platform-links';
import { MODULES, parseMoney, formatBRL, normalizeText } from './planos/plan-helpers';
import { PlanModal } from './planos/plan-modal';
import { PlanCard } from './planos/plan-card';

// ─── PAGE ─────────────────────────────────────────────────────────────────────

/** `readOnly`: só consulta (sem criar, editar, desativar ou excluir plano). */
export function PlanosView({ params: { tenant }, readOnly = false }: { params: { tenant: string }; readOnly?: boolean }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.profile?.toUpperCase() === 'DEV';

  const plansData = useQuery(() => request<any[]>('/platform/plans'), []);
  const [editing, setEditing] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState('');

  const deactivate = useMutation(
    (id: string) => request(`/platform/plans/${id}`, { method: 'DELETE' }),
    { onSuccess: () => plansData.refetch() },
  );

  const reactivate = useMutation(
    (id: string) => request(`/platform/plans/${id}`, { method: 'PATCH', body: { isActive: true } }),
    { onSuccess: () => plansData.refetch() },
  );

  const deletePermanently = useMutation(
    (id: string) => request(`/platform/plans/${id}/permanent`, { method: 'DELETE' }),
    { onSuccess: () => plansData.refetch() },
  );

  const allPlans = plansData.data ?? [];
  const activePlans = allPlans.filter(p => p.isActive !== false);
  const inactivePlans = allPlans.filter(p => p.isActive === false);
  const freePlans = allPlans.filter(p => p.isFree);
  const hiddenPlans = allPlans.filter(p => p.isHidden);
  const visiblePlans = useMemo(() => {
    const base = showInactive ? allPlans : activePlans;
    const term = normalizeText(search.trim());
    if (!term) return base;
    return base.filter((plan) => {
      const moduleNames = (plan.activeModules as string[] | undefined ?? []).map((id) => MODULES.find((m) => m.id === id)?.label ?? id).join(' ');
      return normalizeText(plan.name).includes(term)
        || normalizeText(plan.description || '').includes(term)
        || normalizeText(moduleNames).includes(term)
        || normalizeText(String(plan.price ?? '')).includes(term);
    });
  }, [activePlans, allPlans, search, showInactive]);
  const activeBaseMonthly = activePlans.reduce((acc, plan) => acc + parseMoney(plan.baseMonthlyPrice ?? plan.price), 0);
  const visiblePlanCount = visiblePlans.length;

  const askConfirm = useConfirm();
  async function handleDeactivate(plan: any) {
    if (!(await askConfirm({ title: 'Desativar plano', description: `Desativar o plano "${plan.name}"? Empresas vinculadas não serão afetadas.`, confirmText: 'Desativar plano' }))) return;
    deactivate.mutate(plan.id);
  }

  function handleReactivate(plan: any) {
    reactivate.mutate(plan.id);
  }

  async function handleDeletePermanent(plan: any) {
    if (!(await askConfirm({ title: 'Excluir plano permanentemente', description: `Excluir o plano "${plan.name}". Esta ação não pode ser desfeita.`, confirmText: 'Excluir plano', requireText: 'EXCLUIR' }))) return;
    deletePermanently.mutate(plan.id);
  }

  return (
    <div className="mx-auto w-full space-y-6">
      <header className="rounded-[16px] border border-slate-200 bg-slate-950 px-5 py-5 text-white shadow-2xl shadow-slate-950/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-300">Planos e precificacao</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Planos organizados para crescer com a empresa</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Cada plano tem valor base, valor por usuario adicional, limite de colaboradores e opcao de ficar oculto no console.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={platformLinks(tenant).financeiro('assinaturas')}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-bold text-white shadow-sm hover:bg-white/10"
            >
              <ShieldCheck size={14} />
              Ver assinaturas
            </Link>
            {!readOnly && <button
              onClick={() => setIsCreating(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white shadow-md hover:bg-violet-500"
            >
              <Plus size={14} /> Novo Plano
            </button>}
          </div>
        </div>
      </header>

      {!plansData.loading && allPlans.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Ativos', value: activePlans.length },
            { label: 'Gratuitos', value: freePlans.length },
            { label: 'Ocultos', value: hiddenPlans.length },
            { label: 'Base mensal ativa', value: `R$ ${formatBRL(activeBaseMonthly)}` },
          ].map((stat) => (
            <article key={stat.label} className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{stat.label}</p>
              <p className="mt-2 text-xl font-black tracking-tight text-slate-950">{stat.value}</p>
            </article>
          ))}
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-950">Como a precificacao funciona</h3>
              <p className="mt-1 text-xs text-slate-500">A leitura abaixo vale para a operacao, nao para alterar a regra do backend.</p>
            </div>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
              <Search size={14} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar plano..."
                className="w-44 bg-transparent outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { title: 'Valor base', text: 'Cada plano nasce com um valor base mensal.' },
              { title: 'Adicional por usuario', text: 'O valor sobe conforme a quantidade de usuarios cobraveis.' },
              { title: 'Gratuito / oculto', text: 'Planos internos podem existir sem aparecer como oferta publica.' },
              { title: 'Vinculo com assinatura', text: 'O ajuste reflete nas cobrancas futuras sem recriar a regra.' },
            ].map((item) => (
              <div key={item.title} className="rounded-[14px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[16px] border border-violet-200 bg-violet-50/70 p-5 shadow-sm">
          <h3 className="text-sm font-black text-slate-950">Checklist do plano</h3>
          <ul className="mt-4 space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 text-violet-600" />Valor base salvo no banco</li>
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 text-violet-600" />Usuarios e colaboradores limitados</li>
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 text-violet-600" />Plano ativo, inativo ou oculto</li>
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 text-violet-600" />Ajuste automatico nas cobrancas futuras</li>
            <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 text-violet-600" />Plano nao pode ficar pago com valor zero sem alerta</li>
          </ul>
        </div>
      </section>

      {/* Stats bar */}
      {!plansData.loading && allPlans.length > 0 && (
        <div className="flex items-center gap-6 rounded-[10px] border border-slate-100 bg-white px-5 py-3">
          <div className="text-xs text-slate-500">
            <span className="font-black text-slate-950">{activePlans.length}</span> planos ativos
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="text-xs text-slate-500">
            <span className="font-black text-slate-950">{visiblePlanCount}</span> visiveis
          </div>
          {inactivePlans.length > 0 && (
            <>
              <div className="h-4 w-px bg-slate-200" />
              <div className="text-xs text-slate-500">
                <span className="font-black text-slate-400">{inactivePlans.length}</span> inativos
              </div>
              <button
                onClick={() => setShowInactive(v => !v)}
                className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                {showInactive ? <EyeOff size={12} /> : <Eye size={12} />}
                {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Errors */}
      {(deactivate.error || reactivate.error || deletePermanently.error) && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {deactivate.error || reactivate.error || deletePermanently.error}
        </p>
      )}

      {/* Content */}
      {plansData.error ? (
        <ErrorState message={plansData.error} onRetry={plansData.refetch} />
      ) : plansData.loading ? (
        <LoadingState label="Carregando planos..." />
      ) : visiblePlans.length === 0 ? (
        <EmptyState message={allPlans.length === 0 ? 'Nenhum plano cadastrado. Clique em + Novo Plano para criar.' : 'Nenhum plano ativo no momento.'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visiblePlans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              readOnly={readOnly}
              onEdit={() => setEditing(plan)}
              onDeactivate={() => handleDeactivate(plan)}
              onReactivate={() => handleReactivate(plan)}
              onDelete={() => handleDeletePermanent(plan)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {(isCreating || editing) && (
        <PlanModal
          plan={editing}
          onClose={() => { setIsCreating(false); setEditing(null); }}
          onDone={() => { setIsCreating(false); setEditing(null); plansData.refetch(); }}
        />
      )}
    </div>
  );
}
