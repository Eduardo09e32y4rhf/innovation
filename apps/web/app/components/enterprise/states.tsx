import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export function LoadingState({
  label = 'Carregando...'
}: {
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      <p className="mt-3 text-sm text-gray-400">{label}</p>
    </div>
  );
}

export function EmptyState({
  title = 'Nada por aqui',
  description = 'Tente ajustar os filtros ou volte mais tarde.'
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
        <AlertCircle className="h-7 w-7 text-purple-400" />
      </div>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-2 max-w-lg text-sm text-gray-400">{description}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Falha ao carregar',
  description
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
        <AlertCircle className="h-7 w-7 text-red-400" />
      </div>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      {description ? <p className="mt-2 max-w-lg text-sm text-gray-400">{description}</p> : null}
    </div>
  );
}

