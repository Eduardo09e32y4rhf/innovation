import { AuthLayout } from '@/app/components/auth/AuthLayout';
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