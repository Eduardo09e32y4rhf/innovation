"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // Redirecionar se já autenticado
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Por favor, preencha todos os campos');
      return;
    }

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login';
      setLocalError(errorMessage);
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#05050a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]"></div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 grad-bg rounded-2xl flex items-center justify-center font-bold text-3xl text-white mx-auto shadow-2xl shadow-purple-500/20 mb-6">I</div>
          <h1 className="text-3xl font-black tracking-tight mb-2 uppercase">{t('login.title')}</h1>
          <p className="text-gray-500 text-sm">{t('login.subtitle')}</p>
        </div>

        <div className="glass p-8 rounded-[40px] border border-white/10 shadow-2xl shadow-black/50">
          {/* Error Messages */}
          {(error || localError) && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex gap-3 items-start">
              <AlertCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-200">{t('login.error')}</p>
                <p className="text-xs text-red-300 mt-1">{error || localError}</p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t('login.email')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="email" 
                  placeholder={t('login.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('login.password')}</label>
                <a href="#" className="text-[10px] text-purple-400 hover:text-white transition-colors">{t('login.forgot_password')}</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 grad-bg rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-500/20 disabled:opacity-50"
            >
              {loading ? t('login.authenticating') : t('login.button')} 
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-gray-500 mb-4">{t('login.security')}</p>
            <div className="flex justify-center gap-2 text-green-500 items-center text-[10px] font-bold uppercase tracking-widest">
              <ShieldCheck size={14} /> {t('login.encrypted')}
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-sm text-gray-500">
          {t('login.no_account')} <a href="#" className="text-purple-400 font-bold hover:text-white transition-colors">{t('login.contact_consultant')}</a>
        </p>
      </div>
    </div>
  );
}
