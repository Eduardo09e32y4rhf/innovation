'use client';

import { AuthLayout } from '@/app/components/auth/AuthLayout';
import Link from 'next/link';
import { useState } from 'react';

export default function EsqueciSenhaPage() {
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado(true);
  };

  return (
    <AuthLayout 
      title="Recuperar Senha" 
      subtitle="Informe seu e-mail corporativo para receber o link de redefinição."
      logoSize="lg"
    >
      {enviado ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-[var(--auth-accent-cyan)]/20 flex items-center justify-center mx-auto mb-4 border border-[var(--auth-accent-cyan)]/50">
            <svg className="w-8 h-8 text-[var(--auth-accent-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[var(--auth-text-primary)] mb-2">Verifique seu e-mail</h3>
          <p className="text-sm text-[var(--auth-text-secondary)] mb-8">
            Enviamos um link de recuperação para o e-mail informado. Siga as instruções para criar uma nova senha.
          </p>
          <Link 
            href="/login" 
            className="w-full block py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(to right, var(--auth-accent-purple), var(--auth-accent-violet))' }}
          >
            ← Voltar para o login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">E-mail corporativo</label>
            <input id="email"
              type="email" 
              placeholder="voce@empresa.com.br"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(to right, var(--auth-accent-purple), var(--auth-accent-violet))' }}
          >
            Enviar Link de Recuperação →
          </button>

          <div className="text-center mt-2">
            <p className="text-sm text-[var(--auth-text-secondary)]">
              Lembrou a senha?{' '}
              <Link href="/login" className="font-medium text-[var(--auth-accent-cyan)] hover:text-white transition-colors">
                Voltar para o login
              </Link>
            </p>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}