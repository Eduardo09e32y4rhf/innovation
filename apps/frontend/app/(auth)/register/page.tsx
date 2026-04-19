"use client"

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Building
} from 'lucide-react';

export default function NewRegisterPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => setIsMounted(true), []);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    // SIMULAÇÃO DE CRIAÇÃO DE CONTA SEGURA
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }, 2000);
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen w-full bg-[#05060f] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* Background Effect */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[160px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[140px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[500px] relative z-10"
      >
        <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-[40px] rounded-[32px] p-10 shadow-[0_22px_70px_4px_rgba(0,0,0,0.56)]">
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Create Enterprise ID</h1>
            <p className="text-gray-500 text-sm">Join the next generation of AI management</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input name="name" type="text" required placeholder="John Doe" className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.05] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1">Company</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input name="company" type="text" required placeholder="Innovation Inc" className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.05] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1">Business Email</label>
              <div className="relative text-left">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input name="email" type="email" required placeholder="name@company.com" className="w-full pl-11 pr-4 py-4 bg-white/[0.04] border border-white/[0.05] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input name="password" type="password" required placeholder="••••••••••••" className="w-full pl-11 pr-4 py-4 bg-white/[0.04] border border-white/[0.05] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
            </div>

            <AnimatePresence>
              {status === 'success' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                  Conta criada com sucesso! Redirecionando...
                </motion.div>
              )}
            </AnimatePresence>

            <button
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.03] text-center">
            <p className="text-gray-500 text-xs">
              Already have an account? 
              <button onClick={() => window.location.href = '/login'} className="text-blue-400 font-bold ml-2 hover:underline">Sign In</button>
            </p>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
