'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import React, { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

/* ── Átomo animado puro em CSS-in-JS ─────────────────────────────────────── */
const atomStyles = `
  @keyframes orbit1 { from { transform: rotateZ(0deg) rotateX(70deg); } to { transform: rotateZ(360deg) rotateX(70deg); } }
  @keyframes orbit2 { from { transform: rotateZ(120deg) rotateX(70deg); } to { transform: rotateZ(480deg) rotateX(70deg); } }
  @keyframes orbit3 { from { transform: rotateZ(240deg) rotateX(70deg); } to { transform: rotateZ(600deg) rotateX(70deg); } }
  @keyframes nucleus-pulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(45,212,191,0.5), 0 0 16px 4px rgba(45,212,191,0.3); } 50% { transform: scale(1.18); box-shadow: 0 0 0 6px rgba(45,212,191,0), 0 0 24px 8px rgba(45,212,191,0.15); } }
  @keyframes glow-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  .atom-scene {
    width: 96px; height: 96px;
    position: relative;
    display: flex; align-items: center; justify-content: center;
    transform-style: preserve-3d;
    perspective: 400px;
  }

  .atom-orbit {
    position: absolute;
    width: 100%; height: 100%;
    border-radius: 50%;
    border: 1.5px solid rgba(45,212,191,0.35);
    display: flex; align-items: flex-start; justify-content: center;
  }

  .atom-orbit::before {
    content: '';
    width: 9px; height: 9px;
    background: radial-gradient(circle at 30% 30%, #5eead4, #0d9488);
    border-radius: 50%;
    margin-top: -4.5px;
    box-shadow: 0 0 8px 2px rgba(45,212,191,0.7);
  }

  .orbit-1 { animation: orbit1 2s linear infinite; }
  .orbit-2 { animation: orbit2 2s linear infinite; animation-delay: -0.66s; }
  .orbit-3 { animation: orbit3 2s linear infinite; animation-delay: -1.33s; }

  .atom-nucleus {
    position: absolute;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #5eead4, #0f766e);
    animation: nucleus-pulse 2s ease-in-out infinite;
    z-index: 10;
  }

  .atom-glow-ring {
    position: absolute;
    width: 140px; height: 140px;
    border-radius: 50%;
    background: conic-gradient(from 0deg, transparent 0%, rgba(45,212,191,0.08) 40%, rgba(45,212,191,0.15) 50%, rgba(45,212,191,0.08) 60%, transparent 100%);
    animation: glow-rotate 4s linear infinite;
    pointer-events: none;
  }

  .loading-text-anim {
    animation: fade-up 0.7s ease both;
  }
  .loading-text-anim-delay {
    animation: fade-up 0.7s 0.2s ease both;
  }
  .loading-dots::after {
    content: '';
    animation: dots 1.5s steps(3, end) infinite;
  }
  @keyframes dots {
    0%   { content: ''; }
    33%  { content: '.'; }
    66%  { content: '..'; }
    100% { content: '...'; }
  }
`;

function AtomLoader() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: atomStyles }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 140, height: 140 }}>
        {/* Anel de glow externo */}
        <div className="atom-glow-ring" />
        {/* Cena do átomo */}
        <div className="atom-scene">
          <div className="atom-orbit orbit-1" />
          <div className="atom-orbit orbit-2" />
          <div className="atom-orbit orbit-3" />
          <div className="atom-nucleus" />
        </div>
      </div>
    </>
  );
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, loading, user, company } = useAuth();

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }

    if (!loading && isAuthenticated && user && (user.companyStatus === 'SUSPENDED' || user.companyStatus === 'CANCELLED' || user.billingStatus === 'PAST_DUE' || user.billingStatus === 'CANCELED')) {
      const slug = (company as any)?.slug || company?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || company?.id || 'company';
      if (!window.location.pathname.includes('/fatura-pendente')) {
        router.replace(`/${slug}/fatura-pendente`);
      }
    }
  }, [isAuthenticated, loading, router, user, company]);

  if (loading || !isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at top, #0d2236 0%, #0a1628 50%, #060e1a 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid sutil de fundo */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        {/* Brilho teal ambiente */}
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Card central */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 0, padding: '48px 40px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          minWidth: 280, textAlign: 'center',
        }}>
          {/* Átomo */}
          <AtomLoader />

          {/* Textos */}
          <p className="loading-text-anim" style={{
            marginTop: 24, fontSize: 16, fontWeight: 800,
            color: '#f1f5f9', letterSpacing: '-0.01em',
          }}>
            Preparando seu acesso
          </p>
          <p className="loading-text-anim-delay" style={{
            marginTop: 6, fontSize: 12, fontWeight: 500,
            color: 'rgba(148,163,184,0.8)',
          }}>
            Validando sessão e permissões<span className="loading-dots" />
          </p>

          {/* Linha inferior decorativa */}
          <div style={{
            marginTop: 28, width: 48, height: 2, borderRadius: 1,
            background: 'linear-gradient(90deg, transparent, rgba(45,212,191,0.6), transparent)',
          }} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};