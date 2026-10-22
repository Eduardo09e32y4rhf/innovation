'use client';

import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { PageHeader } from '@/app/components/ui';

/** Casca padrão de toda tela da Plataforma: título, ações no topo e conteúdo com a mesma margem. */
export function PageShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1500px] space-y-4 px-3 py-4 sm:px-5 lg:px-6">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {children}
    </div>
  );
}

interface StateBlockProps {
  loading?: boolean;
  error?: string | null;
  /** Verdadeiro quando a consulta terminou e não há nada para mostrar. */
  empty?: boolean;
  emptyText?: string;
  loadingLabel?: string;
  onRetry?: () => void;
  children: ReactNode;
}

/** Escolhe entre carregando, erro, vazio e conteúdo, sempre na mesma ordem e com os mesmos textos. */
export function StateBlock({ loading, error, empty, emptyText = 'Nada por aqui ainda.', loadingLabel = 'Carregando…', onRetry, children }: StateBlockProps) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading) return <LoadingState label={loadingLabel} />;
  if (empty) return <EmptyState message={emptyText} />;
  return <>{children}</>;
}

/** Aviso para quem abre uma área ou aba sem permissão (a API recusaria a chamada). */
export function NoAccess({ text = 'Seu perfil não tem acesso a esta parte da Plataforma.' }: { text?: string }) {
  return <p role="status" className="card-v2 p-5 text-sm text-fg-sub">{text}</p>;
}
