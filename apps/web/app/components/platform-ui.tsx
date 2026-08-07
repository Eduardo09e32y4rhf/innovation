import React from 'react';
import { Button, Card, PageHeader as UIPageHeader, EmptyState as UIEmptyState, ErrorState as UIErrorState, LoadingState as UILoadingState } from './ui';

/**
 * ============================================================================
 * DESIGN SYSTEM - PLATFORM UI (Light Mode)
 * ============================================================================
 * FASE DE COMPATIBILIDADE:
 * Estes componentes foram adaptados para utilizar a nova UI.
 * ============================================================================
 */

export function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Card className={className}>{children}</Card>;
}

export function SolidCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Card className={className}>{children}</Card>;
}

export function InnerCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`surface-muted p-4 ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <UIPageHeader title={title} subtitle={subtitle} actions={action} />;
}

export function ButtonPrimary({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button variant="primary" className={className} {...props}>{children}</Button>;
}

export function ButtonSecondary({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button variant="secondary" className={className} {...props}>{children}</Button>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <UIEmptyState title={title} message={description} action={action} />;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <UIErrorState message={message} onRetry={retry} />;
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4 w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 w-full rounded-[var(--radius-md)] bg-zinc-100" />
      ))}
    </div>
  );
}

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return <UILoadingState message={label} />;
}
