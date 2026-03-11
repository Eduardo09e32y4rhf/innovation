'use client';

import AppLayout from '@/components/AppLayout';
import { User, Mail, CreditCard, ShieldCheck, ChevronRight, LogOut, Bell, Settings, ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthService } from '@/services/api';

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AuthService.me().then(setUser).finally(() => setLoading(false));
  }, []);

  const sections = [
    {
      title: 'Perfil do Inovador',
      items: [
        { label: 'Nome Completo', value: user?.name || 'Carregando...', icon: User },
        { label: 'E-mail Corporativo', value: user?.email || 'Carregando...', icon: Mail },
      ]
    },
    {
      title: 'Assinatura & Faturamento',
      items: [
        { label: 'Plano Atual', value: 'Enterprise Elite', icon: CreditCard, detail: 'Próxima fatura: 20/03', action: 'Gerenciar' },
        { label: 'Segurança', value: 'Autenticação 2FA Ativa', icon: ShieldCheck, detail: 'Proteção Máxima', action: 'Configurar' },
      ]
    }
  ];

  return (
    <AppLayout title="Configurações da Conta">
      <div className="p-8 max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700">

        {/* Header Profile */}
        <div className="flex flex-col md:flex-row items-center gap-8 bg-white border border-slate-100 p-10 rounded-[3rem] shadow-sm">
          <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-slate-900 text-5xl font-black shadow-xl shadow-indigo-100">

            {user?.name?.[0] || 'U'}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase">{user?.name || 'Carregando...'}</h1>
            <p className="text-slate-500 font-medium tracking-tight mb-6">{user?.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-indigo-100 italic">Enterprise Elite</span>
              <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-emerald-100">Ativo</span>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-slate-50 text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all">
            Editar Perfil
          </button>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-6">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">{section.title}</h2>
              <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-4 shadow-sm space-y-1">
                {section.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="group flex items-center justify-between p-5 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-700 tracking-widest leading-none mb-1">{item.label}</p>
                          <p className="text-sm font-black text-slate-900">{item.value}</p>
                          {item.detail && <p className="text-[9px] font-bold text-indigo-600/60 uppercase mt-0.5">{item.detail}</p>}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-700 group-hover:text-indigo-600 transition-all" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Danger Zone / Global Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button className="flex items-center justify-center gap-3 p-6 bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2rem] hover:border-indigo-100 transition-all group shadow-sm">
            <Bell size={20} className="text-slate-400 group-hover:text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Notificações</span>
          </button>
          <button className="flex items-center justify-center gap-3 p-6 bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2rem] hover:border-indigo-100 transition-all group shadow-sm">
            <Settings size={20} className="text-slate-400 group-hover:text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Preferências</span>
          </button>
          <button className="flex items-center justify-center gap-3 p-6 bg-rose-50 border-rose-100 rounded-[2rem] hover:bg-rose-100 transition-all group shadow-sm">
            <LogOut size={20} className="text-rose-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Encerrar Sessão</span>
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center pt-10">
          <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Innovation.ia v4.2.0 • Enterprise OS</p>
        </div>
      </div>
    </AppLayout>
  );
}
