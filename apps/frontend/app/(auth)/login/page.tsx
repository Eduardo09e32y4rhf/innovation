"use client"

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  Cpu, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function NewLoginPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => setIsMounted(true), []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    
    // PEGANDO OS DADOS
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    // LÓGICA DE LOGIN V2 - ULTRA ESTÁVEL
    setTimeout(() => {
      // Credenciais Mockadas para o deploy imediato (ajustável para API)
      const users: any = {
        'admin@innovation.ia': 'admin123',
        'rh@innovation.ia': 'rh123',
        'finance@innovation.ia': 'finance123'
      };

      if (users[email as string] === password) {
        setStatus('success');
        localStorage.setItem('user_session', JSON.stringify({ email, role: email === 'admin@innovation.ia' ? 'admin' : 'user' }));
        setTimeout(() => {
          window.location.href = email === 'admin@innovation.ia' ? '/dashboard' : '/rh';
        }, 800);
      } else {
        setStatus('error');
        setErrorMsg('Credenciais inválidas ou conta não autorizada.');
        setLoading(false);
      }
    }, 1500);
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen w-full bg-[#05060f] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-purple-500/30">
      
      {/* Luzes de Fundo Estilizadas (Nebula Effect) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/30 blur-[160px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[140px] rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[460px] relative z-10"
      >
        {/* Container Principal Glassmorphism */}
        <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-[40px] rounded-[32px] p-10 shadow-[0_22px_70px_4px_rgba(0,0,0,0.56)] relative overflow-hidden group">
          
          {/* Brilho na borda superior */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

          {/* Header */}
          <div className="text-center mb-10">
            <motion.div 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.6 }}
              className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(147,51,234,0.4)]"
            >
              <Cpu className="text-white w-12 h-12" />
            </motion.div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">
              Innovation<span className="text-purple-500">.ia</span>
            </h1>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-[0.2em]">Enterprise OS v2.0</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Campo Email */}
            <div className="space-y-2">
              <label className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1">Work Email</label>
              <div className="relative group/field">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500 group-focus-within/field:text-purple-400 transition-colors" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="admin@innovation.ia"
                  className="block w-full pl-12 pr-4 py-4 bg-white/[0.04] border border-white/[0.05] rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:bg-white/[0.07] transition-all"
                />
              </div>
            </div>

            {/* Campo Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-end px-1">
                <label className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Master Key</label>
                <button type="button" className="text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-widest transition-colors">Forgot Key?</button>
              </div>
              <div className="relative group/field">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within/field:text-purple-400 transition-colors" />
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="block w-full pl-12 pr-4 py-4 bg-white/[0.04] border border-white/[0.05] rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:bg-white/[0.07] transition-all"
                />
              </div>
            </div>

            {/* Feedback de Status */}
            <AnimatePresence mode="wait">
              {status === 'error' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {errorMsg}
                </motion.div>
              )}
              {status === 'success' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  Acesso Autorizado. Inicializando protocolos...
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botão Submit */}
            <button
              disabled={loading}
              className="w-full relative group/btn overflow-hidden rounded-2xl p-[2px] focus:outline-none disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-[length:200%_auto] animate-gradient" />
              <div className="relative bg-[#0a0b14] h-14 rounded-[14px] flex items-center justify-center gap-3 group-hover/btn:bg-transparent transition-all duration-300">
                {loading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <>
                    <span className="text-white font-bold tracking-widest uppercase text-sm">Initialize Platform</span>
                    <ArrowRight className="w-5 h-5 text-white group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Footer Card */}
          <div className="mt-10 pt-10 border-t border-white/[0.03] text-center">
            <p className="text-gray-500 text-xs">
              Don't have an Enterprise ID? 
              <button className="text-purple-400 font-bold ml-2 hover:underline decoration-2 underline-offset-4 transition-all">Request Access</button>
            </p>
            
            <div className="flex items-center justify-center gap-4 mt-6 opacity-30 grayscale hover:opacity-80 hover:grayscale-0 transition-all cursor-default">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span className="text-[8px] font-bold uppercase tracking-tighter">Biometric Secure</span>
              </div>
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                <span className="text-[8px] font-bold uppercase tracking-tighter">Neural Engine</span>
              </div>
            </div>
          </div>

        </div>

        {/* Glossy Badge */}
        <div className="mt-6 flex justify-center">
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
            <p className="text-[10px] text-gray-400 font-medium">Node: <span className="text-emerald-500">v6.0 Official Release</span></p>
          </div>
        </div>
      </motion.div>

      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
