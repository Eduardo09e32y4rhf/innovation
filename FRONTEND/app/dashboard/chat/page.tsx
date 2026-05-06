import React, { useState } from 'react';
import { Smartphone, CheckCircle, RefreshCcw, Wifi, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function WhatsAppChatPage() {
  const [status, setStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateQR = () => {
    setLoading(true);
    setTimeout(() => {
      setQrCode('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=innovation-ia-omnius-connection');
      setLoading(false);
    }, 1500);
  };

  return (
<div className="max-w-5xl mx-auto animate-in fade-in duration-700">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Chat & Automação WhatsApp</h1>
          </div>
          <p className="text-gray-400">Gerencie sua instância do Omnius AI 6.0 e conecte dispositivos em tempo real.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Controls */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Wifi size={140} />
              </div>

              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${status === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400'}`}>
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Instância Innovation_v6</h3>
                    <p className="text-sm text-gray-500">ID: om-784-innovation-ia</p>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${status === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {status === 'connected' ? '�� CONECTADO' : '�� DESCONECTADO'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <StatusItem label="Status do Node" value="Online" color="text-green-400" />
                <StatusItem label="Webhook URL" value="Ativo" color="text-blue-400" />
                <StatusItem label="Latência" value="45ms" color="text-purple-400" />
                <StatusItem label="Mensagens/Mês" value="12.450" color="text-white" />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={generateQR}
                  className="px-6 py-3 grad-bg rounded-2xl font-bold hover:scale-105 transition-transform flex items-center gap-2"
                >
                  <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                  Gerar Novo QR Code
                </button>
                <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-colors">
                  Logs do Sistema
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="glass p-6 rounded-3xl">
                <AlertTriangle className="text-amber-400 mb-4" />
                <h4 className="font-bold mb-2 text-sm">Alerta de Segurança</h4>
                <p className="text-xs text-gray-500 leading-relaxed">Sua instância está rodando localmente no Electron. Certifique-se de que a porta 3000 está liberada no firewall.</p>
              </div>
              <div className="glass p-6 rounded-3xl">
                <CheckCircle className="text-blue-400 mb-4" />
                <h4 className="font-bold mb-2 text-sm">Auto-Resposta IA</h4>
                <p className="text-xs text-gray-500 leading-relaxed">O motor Gemini 1.5 Pro está pronto para responder candidatos via chat automaticamente.</p>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="glass p-8 rounded-3xl border-purple-500/20 flex flex-col items-center justify-center text-center shadow-2xl">
            <h3 className="text-lg font-bold mb-8">Pareamento</h3>
            
            <div className="relative p-6 bg-white rounded-3xl shadow-2xl mb-8 group">
              {qrCode ? (
                <img src={qrCode} alt="QR Code" className="w-56 h-56 transition-transform group-hover:scale-105" />
              ) : (
                <div className="w-56 h-56 bg-gray-100 flex flex-col items-center justify-center rounded-2xl">
                  <Smartphone size={48} className="text-gray-300 mb-4 animate-bounce" />
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-4">Clique para gerar</span>
                </div>
              )}
              {loading && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-3xl">
                  <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-400 font-medium leading-relaxed px-4">
                Escaneie o código com seu WhatsApp para ativar a integração com a Innovation IA.
              </p>
              <div className="text-[10px] text-gray-500 flex items-center justify-center gap-2 pt-6 border-t border-white/5">
                POWERED BY OMNIUS AI 6.0
              </div>
            </div>
          </div>
        </div>
      </div>
);
}

const StatusItem = ({ label, value, color }) => (
  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{label}</p>
    <p className={`font-bold ${color}`}>{value}</p>
  </div>
);

