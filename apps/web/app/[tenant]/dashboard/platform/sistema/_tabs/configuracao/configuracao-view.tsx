'use client';

import { RefreshCw } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { StateBlock } from '../../../_components/page-shell';
import { ConfigurationGroup, PendingList, buildConfigCards } from './configuration-cards';
import { useConfiguration } from './use-configuration';

const Stat = ({ label, value, detail }: { label: string; value: number | string; detail: string }) => (
  <article className="rounded-2xl border border-border bg-bg p-4 shadow-sm">
    <p className="text-xs font-semibold text-fg-mut">{label}</p>
    <p className="mt-1 text-2xl font-black tabular-nums text-fg">{value}</p>
    <p className="mt-0.5 text-xs text-fg-sub">{detail}</p>
  </article>
);

/** Configuração: números reais de empresas e planos, atalhos por perfil e pendências. */
export function ConfiguracaoView() {
  const { user } = useAuth();
  const { tenant = '' } = useParams<{ tenant: string }>();
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const config = useConfiguration();
  const s = config.summary;
  const cards = buildConfigCards(tenant, role, { companies: s.companies, plans: s.plans, profiles: s.profiles, withoutGateway: s.withoutGateway });
  const time = config.snapshot ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(config.snapshot.loadedAt) : '--:--';
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-sub">Leitura feita às {time}. Cobranças e contratos ficam nas áreas Financeiro e Clientes.</p>
        <Button variant="outline" onClick={() => void config.reload(true)} disabled={config.refreshing}><RefreshCw size={15} className={config.refreshing ? 'animate-spin' : ''} aria-hidden="true" /> Atualizar</Button>
      </div>
      <StateBlock loading={config.loading} error={config.error && !config.snapshot ? config.error : null} loadingLabel="Carregando configuração…" onRetry={() => void config.reload()}>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo">
          <Stat label="Empresas ativas" value={s.active} detail={`${s.companies} cadastradas`} />
          <Stat label="Planos cadastrados" value={s.plans} detail={s.inactivePlans ? `${s.inactivePlans} inativos` : 'Nenhum inativo'} />
          <Stat label="Perfis configurados" value={s.profiles ?? '—'} detail={s.profiles === null ? 'Visível só para o DEV' : 'Políticas carregadas da API'} />
          <Stat label="Pendências" value={s.withoutPlan + s.withoutGateway} detail="Plano ou vínculo de pagamento" />
        </section>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <ConfigurationGroup title="Estrutura e controle" description="Cadastros e políticas que definem como a plataforma opera." items={cards.governance} />
            <ConfigurationGroup title="Acessos, integrações e rastreabilidade" description="Ferramentas para acompanhar o dia a dia." items={cards.operation} />
          </div>
          <PendingList tenant={tenant} withoutPlan={s.withoutPlan} withoutGateway={s.withoutGateway} />
        </div>
      </StateBlock>
    </div>
  );
}
