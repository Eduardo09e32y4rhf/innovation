'use client';
import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react';

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="state-box">
      <Loader2 className="animate-spin text-[var(--color-brand)] mb-2" size={28} />
      <p className="state-title state-loading">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-box state-error">
      <AlertCircle className="text-[var(--color-danger)] mb-2" size={28} />
      <p className="state-title text-rose-800">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-danger mt-2">
          <RefreshCw size={14} /> Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="state-box">
      <div className="state-icon">
        <Inbox size={24} />
      </div>
      <p className="state-description">{message}</p>
    </div>
  );
}
