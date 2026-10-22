'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@/app/hooks/use-data';
import { StateBlock } from '../../../_components/page-shell';
import { platformHub } from '../../../_hub/hub-api';
import { BILLING_STATUS, COMPANY_STATUS, date } from '../../../_hub/format';
import { CompanyOverviewPanel } from '../../../_hub/overview/company-overview';
import { platformLinks } from '../../../_lib/platform-links';

const Info = ({ label, value }: { label: string; value: string }) => <div><dt className="text-xs font-semibold text-fg-mut">{label}</dt><dd className="mt-0.5 break-all text-sm font-medium text-fg">{value}</dd></div>;

/** Geral: dados cadastrais e os números do mês (plano, atraso, fechamentos, atividade). */
export function TabGeral({ companyId }: { companyId: string }) {
  const router = useRouter();
  const { tenant = '' } = useParams<{ tenant: string }>();
  const overview = useQuery(() => platformHub.overview(companyId), [companyId]);
  const data = overview.data?.scope === 'COMPANY' ? overview.data : undefined;
  const links = platformLinks(tenant);
  return (
    <StateBlock loading={overview.loading && !overview.data} error={overview.error} empty={!data} emptyText="Sem dados desta empresa." loadingLabel="Carregando empresa…" onRetry={overview.refetch}>
      {data && (
        <div className="space-y-5">
          <section className="card-v2 p-4" aria-label="Dados da empresa">
            <h2 className="mb-3 text-sm font-bold text-fg">Dados da empresa</h2>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Nome" value={data.company.name} />
              <Info label="Documento" value={data.company.document || 'Sem documento'} />
              <Info label="Identificador" value={data.company.slug} />
              <Info label="Cliente desde" value={date(data.company.createdAt)} />
              <Info label="Situação" value={COMPANY_STATUS[data.company.status]?.label ?? data.company.status} />
              <Info label="Cobrança" value={BILLING_STATUS[data.company.billingStatus]?.label ?? data.company.billingStatus} />
              <Info label="Cliente no provedor de pagamento" value={data.company.asaasCustomerId || 'Ainda não vinculado'} />
              <Info label="Assinatura no provedor" value={data.company.asaasSubscriptionId || 'Ainda não vinculada'} />
            </dl>
            <p className="mt-3 text-xs text-fg-mut">Os identificadores do provedor de pagamento são preenchidos pelo servidor; não há edição manual aqui.</p>
          </section>
          <CompanyOverviewPanel data={data} onGo={(target) => router.push(target === 'contabilidade' ? links.contabilidade(companyId, data.company.name) : links.ficha(companyId, target))} />
        </div>
      )}
    </StateBlock>
  );
}
