'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { AuthService } from '@/services/api';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Limpa qualquer dado anterior
      localStorage.removeItem('token');
      document.cookie =
        'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

      const data = await AuthService.login({ email, password });

      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        document.cookie = `auth_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
        setRedirecting(true);
        window.location.href = '/dashboard';
        return;
      } else {
        setError('Resposta inválida do servidor.');
      }
    } catch (err: any) {
      console.error('Login detail:', err);
      const msg = err?.message || 'Erro desconhecido';

      if (msg.includes('Failed to fetch')) {
        setError(
          'Erro de Rede: O servidor não pôde ser alcançado. Verifique se a API está online.'
        );
      } else if (msg.includes('401')) {
        setError('Email ou senha incorretos.');
      } else if (msg.includes('502')) {
        setError('Erro do Servidor (502): Problema de Gateway na VPS.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  if (redirecting)
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-8 shadow-2xl" />
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          AUTENTICADO
        </h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">
          Sincronizando ambiente corporativo...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed top-0 right-0 w-[50%] h-[50%] bg-indigo-100/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[440px]"
      >
        {/* Brand Area */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200 mb-6">
            <Zap size={30} fill="currentColor" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
            INNOV
            <span className="text-indigo-600 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 text-shadow-glow">
              A
            </span>
            TION IA
          </h1>
          <div className="flex items-center gap-2 mt-4 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full">
            <ShieldCheck size={12} className="text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Acesso Restrito Enterprise
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.05)] border border-slate-100 relative group">
          <div className="absolute top-0 left-12 right-12 h-1 bg-indigo-600 rounded-b-full shadow-[0_2px_10px_rgba(79,70,229,0.3)]" />

          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Bem-vindo
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Insira suas credenciais corporativas
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3"
                >
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5 shrink-0" />
                  <div className="text-[11px] font-black text-rose-600 uppercase tracking-wide leading-relaxed">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ID Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Enterprise Email
              </label>
              <div className="relative">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  type="email"
                  required
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 py-4 pl-12 pr-4 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
                />
              </div>
            </div>

            {/* Key Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Security Key
                </label>
                <button
                  type="button"
                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                >
                  Esqueceu?
                </button>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 py-4 pl-12 pr-12 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none rounded-md"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Inicializar Sistema
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <Link
              href="/register"
              className="text-[11px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors"
            >
              Ainda não possui acesso?{' '}
              <span className="text-indigo-600 ml-1">Criar Conta</span>
            </Link>
          </div>
        </div>

        <p className="text-center mt-10 text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">
          © 2026 Innovation.ia • V6 Protocol Secure
        </p>
      </motion.div>
    </div>
  );
}
