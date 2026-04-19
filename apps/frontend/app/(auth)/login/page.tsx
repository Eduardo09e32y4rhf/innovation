"use client"

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // MANTIDA SUA LÓGICA LOCAL
  const users = {
    'admin@innovation.ia': 'admin123',
    'rh@innovation.ia': 'rh123',
    'finance@innovation.ia': 'finance123'
  };

  const dashboards = {
    'admin@innovation.ia': '/dashboard',
    'rh@innovation.ia': '/rh',
    'finance@innovation.ia': '/finance'
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const email = e.target.email.value;
    const password = e.target.password.value;
    
    // Simula um delay de segurança elegante
    setTimeout(() => {
        if (users[email] === password) {
            localStorage.setItem('user', email);
            window.location.href = dashboards[email];
        } else {
            setError(true);
            setLoading(false);
        }
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f111a] relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] z-10"
      >
        <div className="bg-white/5 border border-white/10 backdrop-blur-2xl p-8 rounded-[2rem] shadow-2xl overflow-hidden relative">
          
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <ShieldCheck className="text-white w-10 h-10" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Innovation.ia</h1>
            <p className="text-gray-400 text-sm">Enterprise Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-gray-300 text-xs font-semibold ml-1 uppercase tracking-wider">Business Email</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                <input 
                  name="email" 
                  type="email" 
                  placeholder="name@company.com" 
                  className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-gray-600"
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-gray-300 text-xs font-semibold ml-1 uppercase tracking-wider">Secure Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                <input 
                  name="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-gray-600"
                  required 
                />
              </div>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-xs text-center font-medium"
                    >
                        Credenciais inválidas. Verifique os dados.
                    </motion.div>
                )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 group active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                  <>
                    Sign In 
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-gray-500 text-xs leading-relaxed uppercase tracking-widest">
              Demo Access Available
            </p>
            <p className="text-purple-400/80 text-[10px] mt-2 font-mono">
                admin@innovation.ia / rh@innovation.ia / finance@innovation.ia
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

