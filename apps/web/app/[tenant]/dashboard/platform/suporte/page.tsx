'use client';

import { Suspense } from 'react';
import { LoadingState } from '@/app/components/data-states';
import { SuporteView } from '../_hub/suporte-view';

/** Suporte: a fila de atendimento da plataforma (componente compartilhado, mantido como está). */
export default function SuportePage() {
  return <Suspense fallback={<LoadingState label="Carregando fila…" />}><SuporteView /></Suspense>;
}
