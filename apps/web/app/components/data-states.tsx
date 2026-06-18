'use client';
import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react';

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[8px] border border-slate-200 bg-white py-16 text-slate-500">
      <Loader2 className="animate-spin text-teal-600" size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[8px] border border-rose-200 bg-rose-50 py-14 text-center">
      <AlertCircle className="text-rose-500" size={28} />
      <p className="max-w-md text-sm text-rose-700">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-1 inline-flex items-center gap-2 rounded-[8px] border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100">
          <RefreshCw size={14} /> Tentar novamente
        </button>
      )}
    </div>
  );
}
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed border-slate-300 bg-white py-16 text-slate-500">
      <Inbox size={28} />
      <p className="text-sm">{message}</p>
    </div>
  );
}
