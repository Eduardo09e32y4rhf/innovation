import { LoadingState as UILoadingState, ErrorState as UIErrorState, EmptyState as UIEmptyState } from './ui';

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return <UILoadingState message={label} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <UIErrorState message={message} onRetry={onRetry} />;
}

export function EmptyState({ message }: { message: string }) {
  return <UIEmptyState message={message} />;
}
