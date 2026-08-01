import React from 'react';

/**
 * ============================================================================
 * DESIGN SYSTEM - PLATFORM UI (Light Mode)
 * ============================================================================
 * Arquivo único para centralizar tokens visuais (cores, bordas, glassmorphism).
 * Nenhuma tela deve reescrever estas regras com classes Tailwind soltas.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// CARDS & CONTAINERS
// ----------------------------------------------------------------------------

/**
 * GlassCard: Usado APENAS para métricas (Dashboard), Headers, Sidebars e Modais.
 * NÃO USAR para tabelas ou dados densos.
 */
export function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.05)] ${className}`}>
      {children}
    </div>
  );
}

/**
 * SolidCard: Usado para tabelas de dados, listas longas (Usuários, Férias, Ponto).
 * Possui fundo branco sólido e contraste limpo. (Usa rounded-3xl para o container principal)
 */
export function SolidCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-white border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/**
 * Card Interno: Usado dentro de SolidCard ou GlassCard para inputs ou agrupar pequenos itens.
 */
export function InnerCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-slate-50 border border-slate-100 p-4 ${className}`}>
      {children}
    </div>
  );
}

// ----------------------------------------------------------------------------
// HEADERS
// ----------------------------------------------------------------------------

/**
 * PageHeader: Cabeçalho padrão de páginas (usa Glass).
 */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-[0_10px_30px_rgba(0,0,0,0.03)] px-8 py-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}

// ----------------------------------------------------------------------------
// BUTTONS & ACTIONS
// ----------------------------------------------------------------------------

/**
 * ButtonPrimary: Botão de ação principal.
 */
export function ButtonPrimary({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-2xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white hover:bg-teal-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * ButtonSecondary: Botão de ação secundária.
 */
export function ButtonSecondary({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-2xl bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-200 transition border border-slate-200 ${className}`}
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
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
      <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        {/* Usamos um icone generico de caixa aqui */}
        <span className="text-xl">📦</span>
      </div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto mb-6">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl bg-rose-50 border border-rose-100">
      <span className="text-2xl mb-3">⚠️</span>
      <p className="text-sm font-bold text-rose-800 mb-4">{message}</p>
      {retry && (
        <button onClick={retry} className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700">
          Tentar Novamente
        </button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 w-full rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}
