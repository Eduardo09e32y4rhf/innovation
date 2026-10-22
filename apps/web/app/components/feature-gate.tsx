'use client';

import type { ReactNode } from 'react';
import { isFeatureEnabled, type WebFeature } from '../lib/feature-flags';

/** Envolve a pagina de um modulo congelado: com a flag desligada mostra "nao encontrada" em vez do conteudo. */
export function FeatureGate({ feature, children }: { feature: WebFeature; children: ReactNode }) {
  if (isFeatureEnabled(feature)) return <>{children}</>;
  return (
    <section role="alert" className="mx-auto my-16 max-w-md rounded-2xl border border-border p-6 text-center">
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-sm opacity-75">Este recurso não está disponível no momento.</p>
      <a href="/" className="mt-4 inline-block text-sm font-medium underline">Voltar ao início</a>
    </section>
  );
}
