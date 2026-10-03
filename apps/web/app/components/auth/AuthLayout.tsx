import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  logoSize?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, logoSize = 'lg', children }: AuthLayoutProps) {
  const logoDimensions = {
    sm: { width: 120, height: 120 },
    md: { width: 180, height: 180 },
    lg: { width: 240, height: 240 }
  };

  return (
    <div 
      className="min-h-[100svh] w-full overflow-x-hidden flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-4 lg:gap-0 px-4 py-5 sm:px-6 lg:px-0 font-sans"
      style={{
        background: 'linear-gradient(135deg, var(--auth-bg-start) 0%, var(--auth-bg-mid) 55%, var(--auth-bg-end) 100%)'
      }}
    >
      {/* Esquerda / Topo (Logo) */}
      <div className="w-full lg:w-1/2 flex min-h-0 flex-col items-center justify-center px-2 py-2 sm:py-4 lg:p-12 relative overflow-hidden">
        {/* Orbital decorativo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="h-[min(72vw,800px)] w-[min(72vw,800px)] rounded-full border border-[var(--auth-accent-cyan)]/30 absolute"></div>
          <div className="h-[min(54vw,600px)] w-[min(54vw,600px)] rounded-full border border-[var(--auth-accent-violet)]/30 absolute"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <Image 
            src="/logo-innovation-clean.png" 
            alt="Innovation RH Connect" 
            width={logoDimensions[logoSize].width} 
            height={logoDimensions[logoSize].height} 
            className="h-auto w-[clamp(132px,38vw,240px)] object-contain drop-shadow-2xl"
            priority
          />
          <p className="mt-3 text-center text-sm lg:mt-5 lg:text-lg font-light tracking-wide max-w-sm" style={{ color: 'var(--auth-text-secondary)' }}>
            Gestão de RH inteligente para o seu negócio
          </p>
        </div>
      </div>

      {/* Direita / Formulário (Card) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-0 py-1 sm:px-4 lg:p-12 z-20">
        <div 
          className="w-full max-w-md p-5 sm:p-7 lg:p-10 rounded-2xl shadow-2xl relative"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)'
          }}
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--auth-text-primary)' }}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm" style={{ color: 'var(--auth-text-secondary)' }}>
                {subtitle}
              </p>
            )}
          </div>
          
          <div className="w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
