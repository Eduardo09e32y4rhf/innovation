'use client';

import { Suspense } from 'react';
import { LoadingState } from '@/app/components/data-states';
import { FeatureGate } from '@/app/components/feature-gate';
import { PageShell } from '../../_components/page-shell';
import { ContractsView } from './contracts-view';

export default function ContratosPage() {
  return (
    <FeatureGate feature="manual-contracts">
      <PageShell title="Contratos" subtitle="Contratos manuais dos clientes: criar, editar, excluir e gerar PDF.">
        <Suspense fallback={<LoadingState label="Carregando contratos…" />}><ContractsView /></Suspense>
      </PageShell>
    </FeatureGate>
  );
}
