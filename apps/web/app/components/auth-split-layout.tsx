import React from 'react';
import Image from 'next/image';

export function AuthSplitLayout({ children, title, subtitle }: { children: React.ReactNode, title?: string, subtitle?: string }) {
  return (
    <div className="app-page flex min-h-screen items-center justify-center p-4 py-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-brand)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--color-brand)]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="w-full max-w-[420px] relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="rounded-[var(--radius-xl)] bg-black p-4 shadow-xl ring-1 ring-black/5 relative w-20 h-20 flex items-center justify-center">
             <Image src="/innovation-logo-dark.png" alt="Innovation" width={64} height={64} priority className="object-contain" />
          </div>
        </div>

        {/* Card */}
        <div className="surface p-8 shadow-[var(--shadow-xl)]">
          {(title || subtitle) && (
            <div className="mb-8 text-center">
              {title && <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>}
              {subtitle && <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">{subtitle}</p>}
            </div>
          )}
          
          <div className="bg-transparent">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

