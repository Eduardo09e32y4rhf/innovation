import React from 'react';
import Image from 'next/image';

export function AuthSplitLayout({ children, title, subtitle }: { children: React.ReactNode, title?: string, subtitle?: string }) {
  return (
    <div className="relative flex min-h-[100svh] items-center justify-center overflow-x-hidden px-4 py-5 sm:py-8" style={{ background: 'linear-gradient(135deg, var(--auth-bg-start) 0%, var(--auth-bg-mid) 55%, var(--auth-bg-end) 100%)' }}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-brand)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--color-brand)]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="w-full max-w-[620px] relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Logo */}
        <div className="mb-4 flex justify-center sm:mb-6">
          <Image src="/logo-innovation-clean.png" alt="Innovation RH Connect" width={240} height={240} priority className="h-auto w-[clamp(120px,32vw,190px)] object-contain drop-shadow-2xl" />
        </div>

        {/* Card */}
        <div className="surface p-5 shadow-[var(--shadow-xl)] sm:p-8">
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

