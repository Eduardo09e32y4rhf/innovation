'use client';

import { AuthLayout } from '@/app/components/auth/AuthLayout';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { login, logout, isAuthenticated, company, user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [didSubmit, setDidSubmit] = useState(false);

  useEffect(() => {
    // Se o usuário navegou até /login manualmente sem ter submetido o formulário, limpamos sessões antigas
    if (!didSubmit && isAuthenticated) {
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Só redirecionamos se o usuário tiver preenchido o form e clicado em "Acessar Plataforma"
    if (didSubmit && isAuthenticated && company) {
      const slug = (company as any).slug || company.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || company.id;
      const isDev = user?.profile?.toUpperCase() === 'DEV' || user?.role?.toUpperCase() === 'DEV';
      const mustPay =
        !isDev &&
        (user?.companyStatus === 'SUSPENDED' ||
          user?.companyStatus === 'CANCELLED' ||
          user?.billingStatus === 'CANCELED' ||
          user?.billingStatus === 'PENDING_PAYMENT');
      
      router.push(mustPay ? `/${slug}/fatura-pendente?autoCheckout=1` : `/${slug}/dashboard`);
    }
  }, [didSubmit, isAuthenticated, company, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    setDidSubmit(true);
    try {
      await login(email, password);
      // O useEffect lidará com o redirecionamento assim que isAuthenticated for true
    } catch (error: any) {
      setDidSubmit(false);
      toast.error(error.message || 'E-mail ou senha incorretos.');
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Entrar na Plataforma" 
      subtitle="Digite suas credenciais corporativas abaixo."
      logoSize="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">E-mail corporativo</label>
          <input id="email"
            type="email" 
            placeholder="voce@empresa.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">Senha</label>
          <div className="relative">
            <input id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--auth-accent-purple)] rounded-md"
            >
              {showPassword ? (
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-1 mb-4">
          <label htmlFor="remember" className="flex items-center gap-2 cursor-pointer text-sm text-[var(--auth-text-secondary)]">
            <input id="remember" type="checkbox" className="rounded border-white/20 bg-white/10 text-[var(--auth-accent-purple)] focus:ring-[var(--auth-accent-purple)]" />
            Lembrar-me
          </label>
          <Link href="/esqueci-senha" className="text-sm font-medium text-[var(--auth-accent-cyan)] hover:text-white transition-colors">
            Esqueci a senha
          </Link>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ background: 'linear-gradient(to right, var(--auth-accent-purple), var(--auth-accent-violet))' }}
        >
          {loading ? 'Entrando...' : 'Acessar Plataforma →'}
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