const fs = require('fs');
const path = require('path');

const loginContent = import { AuthLayout } from '@/app/components/auth/AuthLayout';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <AuthLayout 
      title="Entrar na Plataforma" 
      subtitle="Digite suas credenciais corporativas abaixo."
      logoSize="lg"
    >
      <form className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">E-mail corporativo</label>
          <input 
            type="email" 
            placeholder="voce@empresa.com.br"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">Senha</label>
          <input 
            type="password" 
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
            required
          />
        </div>
        
        <div className="flex items-center justify-between mt-1 mb-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--auth-text-secondary)]">
            <input type="checkbox" className="rounded border-white/20 bg-white/10 text-[var(--auth-accent-purple)] focus:ring-[var(--auth-accent-purple)]" />
            Lembrar-me
          </label>
          <Link href="/esqueci-senha" className="text-sm font-medium text-[var(--auth-accent-cyan)] hover:text-white transition-colors">
            Esqueci a senha
          </Link>
        </div>

        <button 
          type="submit" 
          className="w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(to right, var(--auth-accent-purple), var(--auth-accent-violet))' }}
        >
          Acessar Plataforma →
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--auth-text-secondary)]">
            Ainda não tem uma conta?{' '}
            <Link href="/criar-conta" className="font-medium text-[var(--auth-accent-cyan)] hover:text-white transition-colors">
              Criar agora
            </Link>
          </p>
          <p className="text-sm text-[var(--auth-text-secondary)] mt-2">
            <Link href="/" className="hover:text-white transition-colors">
              ← Voltar para o site
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
;

const criarContaContent = import { AuthLayout } from '@/app/components/auth/AuthLayout';
import Link from 'next/link';

export default function CriarContaPage() {
  return (
    <AuthLayout 
      title="Criar sua Empresa" 
      subtitle="Cadastre sua empresa e comece a usar a plataforma."
      logoSize="lg"
    >
      <form className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">Nome da empresa</label>
          <input 
            type="text" 
            placeholder="Sua Empresa LTDA"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">Nome do responsável</label>
          <input 
            type="text" 
            placeholder="João Silva"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">E-mail corporativo</label>
          <input 
            type="email" 
            placeholder="voce@empresa.com.br"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">Senha</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">Confirmar senha</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
              required
            />
          </div>
        </div>
        
        <div className="flex items-start mt-2 mb-4">
          <label className="flex items-start gap-2 cursor-pointer text-sm text-[var(--auth-text-secondary)] leading-tight">
            <input type="checkbox" className="mt-0.5 rounded border-white/20 bg-white/10 text-[var(--auth-accent-purple)] focus:ring-[var(--auth-accent-purple)]" required />
            <span>
              Eu aceito os <Link href="/termos" className="text-[var(--auth-accent-cyan)] hover:text-white transition-colors">Termos de Uso</Link> e <Link href="/privacidade" className="text-[var(--auth-accent-cyan)] hover:text-white transition-colors">Políticas de Privacidade</Link>
            </span>
          </label>
        </div>

        <button 
          type="submit" 
          className="w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(to right, var(--auth-accent-purple), var(--auth-accent-violet))' }}
        >
          Criar Conta →
        </button>

        <div className="mt-4 text-center">
          <p className="text-sm text-[var(--auth-text-secondary)]">
            Já tem uma conta?{' '}
            <Link href="/login" className="font-medium text-[var(--auth-accent-cyan)] hover:text-white transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
;

const esqueciSenhaContent = 'use client';

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
            <label className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">E-mail corporativo</label>
            <input 
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
;

fs.writeFileSync('apps/web/app/login/page.tsx', loginContent, 'utf8');
fs.writeFileSync('apps/web/app/criar-conta/page.tsx', criarContaContent, 'utf8');
fs.writeFileSync('apps/web/app/esqueci-senha/page.tsx', esqueciSenhaContent, 'utf8');
console.log('Arquivos reescritos via Node.js.');
