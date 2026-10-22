'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/app/components/ui/confirm-provider';
import { useAuth } from '@/app/contexts/AuthContext';
import { api, type PlatformBillingAuditLog, type PlatformFinanceSummary, type PublicPlatformPlan } from '@/app/lib/api';
import { lifecycleLabel, normalizeText, type SubscriptionCompany } from './subscription-model';

const statusOf = (company: SubscriptionCompany) => company.billingStatus || company.subscription?.status || 'TRIAL';

/** Carrega empresas, planos, resumo e auditoria; aplica busca e situação (vindas da URL) e gera a cobrança de onboarding (só DEV). */
export function useSubscriptions(search: string, status: string) {
  const { user } = useAuth();
  const askConfirm = useConfirm();
  const role = String(user?.role || user?.profile || '').toUpperCase();
  const [companies, setCompanies] = useState<SubscriptionCompany[]>([]);
  const [plans, setPlans] = useState<PublicPlatformPlan[]>([]);
  const [summary, setSummary] = useState<PlatformFinanceSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<PlatformBillingAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // O servidor só entrega empresas a DEV/CEO/COMERCIAL e a auditoria a DEV/CEO: para os outros perfis (ex.: CONTABIL) nem pede, em vez de mostrar erro 403.
      const [companiesResponse, plansData, summaryData, logsData] = await Promise.all([
        ['DEV', 'CEO', 'COMERCIAL'].includes(role) ? api.platform.listCompanies({ limit: 1000 }) : Promise.resolve(null),
        api.platform.listPlans(), api.platform.finance.summary(),
        ['DEV', 'CEO'].includes(role) ? api.platform.finance.billingAuditLogs({ limit: 80 }) : Promise.resolve(null),
      ]);
      setCompanies(companiesResponse?.data || []);
      setPlans((plansData || []) as PublicPlatformPlan[]);
      setSummary(summaryData);
      setAuditLogs(logsData || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as assinaturas.');
    } finally { setLoading(false); }
  }, [role]);

  useEffect(() => { void load(); }, [load]);

  const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);
  const rows = useMemo(() => {
    const term = normalizeText(search.trim());
    return companies.filter((company) => {
      if (status && statusOf(company) !== status) return false;
      if (!term) return true;
      const plan = planById.get(company.platformPlanId || '');
      return [company.name, company.document || '', plan?.name || '', lifecycleLabel(company)].some((text) => normalizeText(text).includes(term));
    });
  }, [companies, planById, search, status]);
  const totals = useMemo(() => {
    const count = (key: string) => companies.filter((company) => statusOf(company) === key).length;
    return { active: count('ACTIVE'), pending: count('PENDING_PAYMENT'), overdue: count('PAST_DUE') };
  }, [companies]);

  async function runCheckout(company: SubscriptionCompany) {
    if (!(await askConfirm({ title: 'Gerar cobrança de onboarding', description: `Gerar ou atualizar a cobrança de onboarding para ${company.name}?`, confirmText: 'Gerar cobrança', variant: 'primary' }))) return;
    setWorkingId(company.id);
    try { await api.platform.finance.checkoutCompany(company.id); toast.success('Cobrança de onboarding gerada.'); await load(); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Não foi possível gerar a cobrança.'); }
    finally { setWorkingId(null); }
  }

  return { rows, planById, summary, totals, auditLogs: auditLogs.slice(0, 12), loading, error, load, workingId, runCheckout, canRunCheckout: role === 'DEV' };
}
