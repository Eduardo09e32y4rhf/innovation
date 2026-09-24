import { AuthLayout } from '@/app/components/auth/AuthLayout';
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
          <label htmlFor="companyName" className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">Nome da empresa</label>
          <input 
            id="companyName"
            type="text" 
            placeholder="Sua Empresa LTDA"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
            required
          />
        </div>
        <div>
          <label htmlFor="userName" className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">Nome do responsável</label>
          <input 
            id="userName"
            type="text" 
            placeholder="João Silva"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">E-mail corporativo</label>
          <input 
            id="email"
            type="email" 
            placeholder="voce@empresa.com.br"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">Senha</label>
            <input 
              id="password"
              type="password" 
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
              required
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--auth-text-secondary)] mb-1">Confirmar senha</label>
            <input 
              id="confirmPassword"
              type="password" 
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-[var(--auth-text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent-purple)] transition-all"
              required
            />
          </div>
        </div>
        
        <div className="flex items-start mt-2 mb-4">
          <label htmlFor="terms" className="flex items-start gap-2 cursor-pointer text-sm text-[var(--auth-text-secondary)] leading-tight">
            <input id="terms" type="checkbox" className="mt-0.5 rounded border-white/20 bg-white/10 text-[var(--auth-accent-purple)] focus:ring-[var(--auth-accent-purple)]" required />
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