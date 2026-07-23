import React from 'react';

export function AuthSplitLayout({ children, title, subtitle }: { children: React.ReactNode, title?: string, subtitle?: string }) {
  return (
    <div className="flex min-h-screen w-full bg-white font-sans selection:bg-brand-500/30 overflow-hidden">
      
      {/* Lado Esquerdo - Imagem (Oculto no mobile) 60% */}
      <div className="relative hidden lg:flex w-[60%] items-center justify-center bg-black overflow-hidden">
        {/* A imagem com fundo preto se funde perfeitamente com o bg-black da div */}
        <div className="relative z-10 flex h-full w-full items-center justify-center p-12">
          <img 
            src="/innovation-logo-dark.png" 
            alt="Innovation Logo" 
            className="w-full max-w-[600px] object-contain drop-shadow-2xl animate-in fade-in zoom-in-95 duration-1000"
          />
        </div>
      </div>
      
      {/* Lado Direito - Formulário 40% */}
      <div className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-[40%] sm:px-12 xl:px-16 bg-white border-l border-slate-100 shadow-[-20px_0_40px_rgba(0,0,0,0.02)] overflow-y-auto">
        
        <div className="relative z-10 mx-auto w-full max-w-[420px] animate-in slide-in-from-bottom-8 fade-in duration-700">
          
          {/* Logo no Mobile (Só aparece em telas pequenas) */}
          <div className="mb-10 flex justify-center lg:hidden">
            <div className="rounded-[20px] bg-black p-6 shadow-2xl ring-1 ring-black/5">
               <img src="/innovation-logo-dark.png" alt="Innovation" className="h-10 w-auto object-contain" />
            </div>
          </div>

          {(title || subtitle) && (
            <div className="mb-10">
              {title && <h1 className="text-[32px] font-black tracking-tight text-slate-900 leading-tight">{title}</h1>}
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
