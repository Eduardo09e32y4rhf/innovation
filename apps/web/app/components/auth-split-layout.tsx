import React from 'react';

export function AuthSplitLayout({ children, title, subtitle }: { children: React.ReactNode, title?: string, subtitle?: string }) {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-brand-500/30">
      {/* Lado Esquerdo - Imagem (Oculto no mobile) */}
      <div className="relative hidden lg:flex w-[60%] items-center justify-center overflow-hidden bg-black">
        {/* Fundo totalmente preto para fundir perfeitamente com a logo */}
        
        <div className="relative z-10 flex h-full w-full items-center justify-center p-12">
          <img 
            src="/innovation-logo-dark.png" 
            alt="Innovation Logo" 
            className="w-full max-w-2xl object-contain drop-shadow-2xl animate-in fade-in zoom-in-95 duration-1000"
          />
        </div>
      </div>
      
      {/* Lado Direito - Formulário */}
      <div className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-[40%] sm:px-12 xl:px-24 bg-white">
        
        <div className="relative z-10 mx-auto w-full max-w-[420px] animate-in slide-in-from-bottom-8 fade-in duration-700">
          
          {/* Logo no Mobile (Só aparece em telas pequenas) */}
          <div className="mb-10 flex justify-center lg:hidden">
            <div className="rounded-2xl bg-black p-5 shadow-2xl ring-1 ring-black/5">
               <img src="/innovation-logo-dark.png" alt="Innovation" className="h-10 w-auto object-contain" />
            </div>
          </div>

          {(title || subtitle) && (
            <div className="mb-10 text-center">
              {title && <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>}
              {subtitle && <p className="mt-2 text-sm font-medium text-slate-500">{subtitle}</p>}
            </div>
          )}
          
          <div className="bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
