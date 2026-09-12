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
    md: { width: 240, height: 240 },
    lg: { width: 400, height: 400 }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col lg:flex-row items-center justify-center lg:justify-between font-sans"
      style={{
        background: 'linear-gradient(135deg, var(--auth-bg-start) 0%, var(--auth-bg-mid) 55%, var(--auth-bg-end) 100%)'
      }}
    >
      {/* Esquerda / Topo (Logo) */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-hidden">
        {/* Orbital decorativo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-[800px] h-[800px] rounded-full border border-[var(--auth-accent-cyan)]/30 absolute"></div>
          <div className="w-[600px] h-[600px] rounded-full border border-[var(--auth-accent-violet)]/30 absolute"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <Image 
            src="/logo-innovation-clean.png" 
            alt="Innovation RH Connect" 
            width={logoDimensions[logoSize].width} 
            height={logoDimensions[logoSize].height} 
            className="object-contain drop-shadow-2xl"
            priority
          />
          <p className="mt-8 text-center text-lg lg:text-xl font-light tracking-wide max-w-sm" style={{ color: 'var(--auth-text-secondary)' }}>
            Gestão de RH inteligente para o seu negócio
          </p>
        </div>
      </div>

      {/* Direita / Formulário (Card) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-12 z-20">
        <div 
          className="w-full max-w-md p-8 lg:p-10 rounded-2xl shadow-2xl relative"
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