import React, { useState } from 'react';
import { Plus, MessageCircle, ShieldCheck, Power, MoreVertical, Smartphone } from 'lucide-react';

const WhatsAppAccountsPage = () => {
  const [accounts, setAccounts] = useState([
    { id: '1', name: 'Recrutamento Principal', number: '+55 11 98888-7777', status: 'CONNECTED' },
    { id: '2', name: 'Suporte Innovation', number: '+55 11 91111-2222', status: 'DISCONNECTED' },
  ]);

  return (
<div className="max-w-6xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Números Conectados</h1>
            <p className="text-gray-400">Gerencie múltiplas instâncias do WhatsApp Omnius AI.</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 grad-bg rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-purple-500/20">
            <Plus size={20} /> Adicionar Novo Número
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.map((acc) => (
            <div key={acc.id} className="glass p-8 rounded-[32px] border border-white/5 relative group hover:border-purple-500/30 transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${acc.status === 'CONNECTED' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                   <Smartphone size={28} />
                </div>
                <div className="flex items-center gap-2">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${acc.status === 'CONNECTED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {acc.status}
                   </span>
                   <button className="p-2 text-gray-500 hover:text-white"><MoreVertical size={18} /></button>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-1">{acc.name}</h3>
              <p className="text-sm text-gray-500 mb-8">{acc.number}</p>

              <div className="flex gap-4">
                 <button className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <Power size={14} /> Desconectar
                 </button>
                 <button className="flex-1 py-3 grad-bg rounded-xl text-xs font-bold shadow-lg shadow-purple-500/10 flex items-center justify-center gap-2">
                    <MessageCircle size={14} /> Abrir Chat
                 </button>
              </div>
            </div>
          ))}
          
          {/* Card de Adição */}
          <div className="border-2 border-dashed border-white/5 rounded-[32px] flex flex-col items-center justify-center p-12 hover:bg-white/[0.02] transition-all cursor-pointer group">
             <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-700 group-hover:text-purple-400 group-hover:bg-purple-500/10 mb-4 transition-all">
                <Plus size={24} />
             </div>
             <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Nova Instância</p>
          </div>
        </div>
      </div>
);
};

export default WhatsAppAccountsPage;

