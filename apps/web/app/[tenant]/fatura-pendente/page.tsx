"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, LogOut, FileText } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

export default function FaturaPendentePage() {
  const router = useRouter();
  const { user, logout, loading, isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!loading && (!isAuthenticated || !user)) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading || !user) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-[24px] border border-rose-500/30 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl text-center">
        
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
          <AlertTriangle size={48} strokeWidth={2} />
        </div>
        
        <h1 className="text-2xl font-black text-white mb-4">Acesso Bloqueado</h1>
        
        <p className="text-slate-400 mb-6">
          Sua empresa possui pendências financeiras e o acesso à plataforma foi suspenso.
        </p>

        {user.profile === 'admin' ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-slate-300">
              Como administrador, você pode regularizar a situação pagando a fatura pendente.
            </p>
            <p className="text-xs text-rose-400 mb-2">
              Acesse seu e-mail cadastrado ({user.email}) para obter o link de pagamento do Asaas, ou entre em contato com o suporte.
            </p>
            
            {/* Opcional: Futuramente, aqui você pode consumir uma rota /finance/invoices para pegar o link de pagamento do Asaas diretamente */}

            <button
              onClick={() => logout()}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-800 font-bold text-white transition-colors hover:bg-slate-700"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-slate-300">
              Por favor, entre em contato com o administrador ou o RH da sua empresa para regularizar o acesso.
            </p>
            <button
              onClick={() => logout()}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-800 font-bold text-white transition-colors hover:bg-slate-700"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
