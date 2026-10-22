'use client';

import { FeatureGate } from '@/app/components/feature-gate';
import { PageShell } from '../../_components/page-shell';
import { PropostasView } from '../../_hub/propostas-view';

export default function PropostasPage() {
  return (
    <FeatureGate feature="proposals">
      <PageShell title="Propostas" subtitle="Pipeline comercial: propostas enviadas, aceitas e recusadas."><PropostasView /></PageShell>
    </FeatureGate>
  );
}
