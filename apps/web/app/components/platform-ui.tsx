import React from 'react';

/**
 * ============================================================================
 * DESIGN SYSTEM - PLATFORM UI (Light Mode)
 * ============================================================================
 * FASE DE COMPATIBILIDADE:
 * Estes componentes foram adaptados para utilizar as novas classes do globals.css.
 * No futuro, as páginas serão refatoradas para usar diretamente os componentes UI oficiais.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// CARDS & CONTAINERS
// ----------------------------------------------------------------------------

export function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`surface ${className}`}>
      {children}
    </div>
  );
}

export function SolidCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`surface ${className}`}>
      {children}
    </div>
  );
}

export function InnerCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`surface-muted p-4 ${className}`}>
      {children}
    </div>
  );
}

// ----------------------------------------------------------------------------
// HEADERS
// ----------------------------------------------------------------------------

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-header-content">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-description">{subtitle}</p>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </header>
  );
}

// ----------------------------------------------------------------------------
// BUTTONS & ACTIONS
// ----------------------------------------------------------------------------

export function ButtonPrimary({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`btn btn-primary ${className}`}
    >
      {children}
    </button>
  );
}

export function ButtonSecondary({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`btn btn-secondary ${className}`}
    >
      {children}
    </button>
  );
}

// ----------------------------------------------------------------------------
// FEEDBACK STATES (Loading, Empty, Error)
// ----------------------------------------------------------------------------

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="state-box">
      <div className="state-icon">
        <span className="text-xl">📦</span>
      </div>
      <h3 className="state-title">{title}</h3>
      <p className="state-description mb-6">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="state-box state-error">
      <span className="text-2xl mb-3">⚠️</span>
      <p className="state-title text-rose-800 mb-4">{message}</p>
      {retry && (
        <button onClick={retry} className="btn btn-danger">
          Tentar Novamente
        </button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4 w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 w-full rounded-lg bg-zinc-100" />
      ))}
    </div>
  );
}

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="state-box">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[var(--color-brand)] mb-4" />
      <p className="state-title state-loading">{label}</p>
    </div>
  );
}

