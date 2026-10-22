'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, request, type PlatformCompany, type PublicPlatformPlan } from '@/app/lib/api';

type GlobalPermission = { role: string; permissions: string[] };
type PlanWithStatus = PublicPlatformPlan & { isActive?: boolean };

interface Snapshot { companies: PlatformCompany[]; plans: PlanWithStatus[]; permissions: GlobalPermission[] | null; loadedAt: Date }

/**
 * Lê empresas, planos e (quando o perfil pode) as permissões globais.
 * Permissões são só do DEV na API: para os demais o número fica de fora em vez de derrubar a tela.
 */
export function useConfiguration() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [companies, plans, permissions] = await Promise.all([
        api.platform.listCompanies({ limit: 1000 }),
        api.platform.listPlans() as Promise<PlanWithStatus[]>,
        request<GlobalPermission[]>('/platform/global-permissions').catch(() => null),
      ]);
      setSnapshot({ companies: companies?.data ?? [], plans: plans ?? [], permissions, loadedAt: new Date() });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a configuração.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => {
    const companies = snapshot?.companies ?? [];
    const plans = snapshot?.plans ?? [];
    const plansById = new Map(plans.map((plan) => [plan.id, plan]));
    const withoutPlan = companies.filter((company) => !company.platformPlanId && !company.planId && !company.plan);
    const withoutGateway = companies.filter((company) => {
      const plan = plansById.get(company.platformPlanId || company.planId || '');
      const free = company.plan === 'FREE' || plan?.isFree === true;
      return ['ACTIVE', 'PAST_DUE', 'PENDING_PAYMENT'].includes(company.billingStatus || '') && !free && !company.asaasCustomerId;
    });
    return {
      companies: companies.length,
      active: companies.filter((company) => company.status === 'ACTIVE' || company.isActive).length,
      plans: plans.length,
      inactivePlans: plans.filter((plan) => plan.isActive === false).length,
      profiles: snapshot?.permissions?.length ?? null,
      withoutPlan: withoutPlan.length,
      withoutGateway: withoutGateway.length,
    };
  }, [snapshot]);

  return { snapshot, summary, loading, refreshing, error, reload: load };
}
