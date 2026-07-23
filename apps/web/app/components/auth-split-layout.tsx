import React from 'react';

export function AuthSplitLayout({ children, title, subtitle }: { children: React.ReactNode, title?: string, subtitle?: string }) {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-brand-500/30">
      {/* Lado Esquerdo - Imagem (Oculto no mobile) */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-black lg:flex">
        {/* Efeitos de brilho sutis no fundo preto */}
        <div className="pointer-events-none absolute -top-[20%] left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-[100%] bg-purple-600/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-[20%] left-0 h-[500px] w-full bg-indigo-900/40 blur-[100px]" />
        
        <div className="relative z-10 flex h-full w-full items-center justify-center p-12">
          <img 
            src="/innovation-logo-dark.png" 
            alt="Innovation Logo" 
            className="w-full max-w-lg object-contain drop-shadow-2xl animate-in fade-in zoom-in-95 duration-1000"
          />
        </div>
      </div>
      
      {/* Lado Direito - Formulário */}
      <div className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 sm:px-12 xl:px-24">
        {/* Padrão de grid super suave no lado branco */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        <div className="relative z-10 mx-auto w-full max-w-md animate-in slide-in-from-bottom-8 fade-in duration-700">
          
          {/* Logo no Mobile (Só aparece em telas pequenas) */}
          <div className="mb-10 flex justify-center lg:hidden">
            <div className="rounded-2xl bg-black p-5 shadow-2xl ring-1 ring-black/5">
               <img src="/innovation-logo-dark.png" alt="Innovation" className="h-10 w-auto object-contain" />
            </div>
          </div>

          {(title || subtitle) && (
            <div className="mb-8">
              {title && <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>}
              {subtitle && <p className="mt-2 text-sm font-medium text-slate-500">{subtitle}</p>}
            </div>
          )}
          
          <div className="rounded-[24px] border border-slate-200/60 bg-white p-8 shadow-[0_20px_40px_rgba(0,0,0,0.04)] sm:p-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
