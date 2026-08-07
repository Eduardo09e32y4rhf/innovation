import * as React from 'react';
import { Loader2, AlertCircle, FileSearch } from 'lucide-react';
import { Button } from './button';

export function LoadingState({ message = 'Carregando dados...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-zinc-500 bg-white/50 rounded-[var(--radius-xl)] border border-dashed border-zinc-200">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand)] mb-4" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function ErrorState({ title = 'Erro ao carregar', message = 'Ocorreu um problema.', onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-rose-50/50 rounded-[var(--radius-xl)] border border-dashed border-rose-200">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 mb-4">
        <AlertCircle className="h-6 w-6 text-rose-600" />
      </div>
      <h3 className="text-sm font-bold text-rose-900 mb-1">{title}</h3>
      <p className="text-sm text-rose-600/80 mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title = 'Nenhum registro', message = 'Não há dados para exibir no momento.', action }: { title?: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-50/50 rounded-[var(--radius-xl)] border border-dashed border-zinc-200">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 mb-4">
        <FileSearch className="h-6 w-6 text-zinc-400" />
      </div>
      <h3 className="text-sm font-bold text-zinc-900 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 mb-4 max-w-sm">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
