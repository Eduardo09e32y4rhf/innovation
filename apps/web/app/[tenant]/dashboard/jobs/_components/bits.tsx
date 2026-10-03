'use client';

import type { ReactNode } from 'react';

export const inputClass = 'input-v2 w-full text-base sm:text-sm';

export function Field({ label, hint, required, children, className = '' }: { label: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 text-sm font-medium text-fg ${className}`}>
      <span>{label}{required && <span className="text-rose-600"> *</span>}</span>
      {children}
      {hint && <span className="block text-xs font-normal text-fg-sub">{hint}</span>}
    </label>
  );
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' }) {
  const tones = {
    default: 'bg-zinc-100 text-zinc-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
    info: 'bg-blue-50 text-blue-700',
    brand: 'bg-purple-50 text-purple-700',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function TagChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium" style={{ borderColor: color, color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {name}
    </span>
  );
}

export function SectionCard({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card-v2 space-y-4 p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-fg-sub">{description}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
