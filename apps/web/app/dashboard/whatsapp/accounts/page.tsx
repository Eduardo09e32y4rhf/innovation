'use client';

import React, { useEffect, useState } from 'react';
import {
  Bot,
  Calendar,
  Key,
  MessageCircle,
  Plus,
  Power,
  QrCode,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiBaseUrl, getAuthHeaders } from '../api';

function normalizeStatus(status: unknown) {
  return String(status || 'DISCONNECTED').toUpperCase();
}

function formatPhone(phone: string | null | undefined) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  return `+${digits}`;
}

type AccountCard = {
  id: string;
  name: string;
  number: string;
  status: string;
};

const WhatsAppAccountsPage = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountCard[]>([
    {
      id: '1',
      name: 'Seu WhatsApp',
      number: 'Pronto para conectar pela primeira vez.',
      status: 'DISCONNECTED',
    },
  ]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [msStatus, setMsStatus] = useState('DISCONNECTED');
  const [geminiKey, setGeminiKey] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
  const [aiEngine, setAiEngine] = useState<'gemini' | 'gpt'>('gemini');
  const [aiTemp, setAiTemp] = useState(70);
  const [aiPrompt, setAiPrompt] = useState(
    'Voce e a assistente virtual da Innovation. Seja cordial e foque em guiar o candidato para entrevistas.',
  );
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarUserEmail, setCalendarUserEmail] = useState('');

  const syncAccountFromStatus = (payload: any) => {
    const data = payload?.data ?? payload ?? {};
    const status = normalizeStatus(data.status);
    const nextQrCode = data.qrCode || '';
    const config = data.config || {};
    const calendar = data.calendar || {};
    const displayName = data.displayName || user?.name || 'Seu WhatsApp';
    const connectedPhone = formatPhone(data.phone);

    setMsStatus(status);
    setQrCode(nextQrCode);
    setGeminiKey(config.geminiApiKey || '');
    setOpenAiKey(config.openAiApiKey || '');
    setAiEngine(config.aiEngine || 'gemini');
    setAiTemp(config.temperature || 70);
    setAiPrompt(config.prompt || '');
    setCalendarConnected(Boolean(calendar.isConnected));
    setCalendarUserEmail(calendar.userEmail || '');

    setAccounts([
      {
        id: '1',
        name: displayName,
        number:
          status === 'CONNECTED'
            ? connectedPhone || 'WhatsApp conectado com sucesso.'
            : 'Pronto para conectar pela primeira vez.',
        status,
      },
    ]);

    if (status === 'CONNECTED') setQrModalOpen(false);
  };

  const checkStatus = async () => {
    const res = await fetch(`${getApiBaseUrl()}/communication/whatsapp/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Status error: ${res.status}`);
    syncAccountFromStatus(await res.json());
  };

  const startConnection = async () => {
    setScanning(true);
    setQrCode('');
    setQrModalOpen(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/communication/whatsapp/connect`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Connect error: ${res.status}`);
      await checkStatus();
    } finally {
      setScanning(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch(`${getApiBaseUrl()}/communication/whatsapp/disconnect`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    await checkStatus();
  };

  const handleSaveConfig = async () => {
    const res = await fetch(`${getApiBaseUrl()}/communication/settings`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        aiEngine,
        geminiApiKey: geminiKey,
        openAiApiKey: openAiKey,
        prompt: aiPrompt,
        temperature: aiTemp,
      }),
    });
    if (!res.ok) throw new Error(`Config error: ${res.status}`);
    setConfigModalOpen(false);
    await checkStatus();
  };

  const connectGoogleCalendar = async () => {
    const res = await fetch(`${getApiBaseUrl()}/communication/calendar/auth-url`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Calendar auth error: ${res.status}`);
    const data = await res.json();
    const authUrl = data.data?.authUrl ?? data.authUrl;
    if (authUrl) window.open(authUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    void checkStatus().catch((error) => console.error('Erro ao buscar status', error));
    const interval = setInterval(() => {
      void checkStatus().catch((error) => console.error('Erro ao atualizar status', error));
    }, 5000);
    return () => clearInterval(interval);
  }, [user?.name]);

  useEffect(() => {
    if (!qrModalOpen) return;

    const interval = setInterval(() => {
      void checkStatus().catch((error) => console.error('Erro ao atualizar QR', error));
    }, 1200);

    return () => clearInterval(interval);
  }, [qrModalOpen, user?.name]);

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 py-10 duration-700">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Instancia Oficial do WhatsApp</h1>
          <p className="text-gray-400">Uma unica integracao Omnius para WhatsApp, Gemini, GPT e Google Agenda.</p>
        </div>
        <button
          onClick={() => void startConnection().catch((error) => console.error(error))}
          className="grad-bg flex items-center gap-2 rounded-2xl px-6 py-3 font-bold shadow-lg shadow-purple-500/20 transition-transform hover:scale-105"
        >
          <Plus size={20} /> Conectar Instancia
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="glass group relative rounded-[32px] border border-white/5 p-8 transition-all hover:border-purple-500/30"
          >
            <div className="mb-6 flex items-start justify-between">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                  acc.status === 'CONNECTED' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}
              >
                <Smartphone size={28} />
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    acc.status === 'CONNECTED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {acc.status}
                </span>
                <button
                  onClick={() => setConfigModalOpen(true)}
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Settings size={18} />
                </button>
              </div>
            </div>

            <h3 className="mb-1 text-xl font-bold">{acc.name}</h3>
            <p className="mb-1 text-sm text-gray-500">{acc.number}</p>
            <p className="text-xs text-gray-400">
              {acc.status === 'CONNECTED'
                ? 'Instancia ativa e pronta para conversar.'
                : 'Nenhum WhatsApp conectado ainda. O cliente pode parear aqui pela primeira vez.'}
            </p>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => void (acc.status === 'CONNECTED' ? handleDisconnect() : startConnection())}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold transition-all hover:bg-white/10"
              >
                <Power size={14} /> {acc.status === 'CONNECTED' ? 'Desconectar' : 'Conectar'}
              </button>
              <Link
                href="/dashboard/whatsapp/chat"
                className="grad-bg flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold shadow-lg shadow-purple-500/10 transition-transform hover:scale-105"
              >
                <MessageCircle size={14} /> Abrir Chat
              </Link>
            </div>
          </div>
        ))}

        <div
          onClick={() => void startConnection().catch((error) => console.error(error))}
          className="group flex cursor-pointer flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-white/5 p-12 transition-all hover:border-purple-500/30 hover:bg-white/[0.02]"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-gray-700 transition-all group-hover:bg-purple-500/10 group-hover:text-purple-400">
            <QrCode size={32} />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 transition-colors group-hover:text-purple-400">
            Conectar via QR Code
          </p>
        </div>
      </div>

      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-300 fade-in">
          <div className="glass relative flex w-full max-w-4xl overflow-hidden rounded-[40px] border border-white/10 shadow-2xl">
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute right-6 top-6 z-10 text-gray-500 hover:text-white"
            >
              <X size={24} />
            </button>

            <div className="flex w-1/2 flex-col justify-center bg-[#0a0a0f] p-12">
              <div className="grad-bg mb-6 flex h-12 w-12 items-center justify-center rounded-2xl">
                <Smartphone size={24} className="text-white" />
              </div>
              <h2 className="mb-4 text-3xl font-extrabold">Conecte seu WhatsApp</h2>
              <ul className="space-y-6 text-sm text-gray-400">
                <li className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                    1
                  </span>
                  Abra o WhatsApp no seu celular
                </li>
                <li className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                    2
                  </span>
                  Toque em <strong className="text-white">Aparelhos conectados</strong>
                </li>
                <li className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                    3
                  </span>
                  Escaneie o QR Code desta tela
                </li>
              </ul>
            </div>

            <div className="relative flex w-1/2 flex-col items-center justify-center bg-black/40 p-12">
              <div className="relative">
                <div className="flex min-h-[256px] min-w-[256px] items-center justify-center rounded-3xl bg-white p-4 shadow-[0_0_40px_rgba(168,85,247,0.3)]">
                  {qrCode ? (
                    <img src={qrCode} alt="QR Code" className="h-64 w-64 rounded-xl" />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw size={32} className="mb-4 animate-spin text-purple-500" />
                      <p className="text-sm font-bold text-gray-800">
                        {scanning ? 'Gerando QR Code...' : 'Aguardando QR Code...'}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">Status atual: {msStatus}</p>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-8 flex items-center gap-2 font-mono text-xs text-gray-500">
                <ShieldCheck size={14} className="text-green-400" /> Criptografia de ponta a ponta
              </p>
            </div>
          </div>
        </div>
      )}

      {configModalOpen && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-300 fade-in">
          <div className="glass flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-[40px] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] p-8">
              <h2 className="flex items-center gap-3 text-2xl font-bold">
                <Settings className="text-purple-400" /> Configuracoes da Instancia
              </h2>
              <button onClick={() => setConfigModalOpen(false)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto p-8">
              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-400">
                  <Key size={16} className="text-yellow-400" /> Chaves de API
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <label className="mb-2 block text-xs text-gray-400">Gemini API Key</label>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="Insira sua chave do Google AI Studio..."
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <label className="mb-2 block text-xs text-gray-400">OpenAI / GPT API Key</label>
                    <input
                      type="password"
                      value={openAiKey}
                      onChange={(e) => setOpenAiKey(e.target.value)}
                      placeholder="Insira sua chave da OpenAI..."
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-400">
                  <Bot size={16} className="text-blue-400" /> Inteligencia Artificial
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <label className="mb-2 block text-xs text-gray-400">Motor de IA Padrao</label>
                    <select
                      value={aiEngine}
                      onChange={(e) => setAiEngine(e.target.value as 'gemini' | 'gpt')}
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="gemini">Gemini</option>
                      <option value="gpt">GPT</option>
                    </select>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <label className="mb-2 block text-xs text-gray-400">Temperatura ({aiTemp})</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={aiTemp}
                      onChange={(e) => setAiTemp(parseInt(e.target.value, 10))}
                      className="w-full accent-purple-500"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-gray-500">
                      <span>Exato</span>
                      <span>Criativo</span>
                    </div>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <label className="mb-2 block text-xs text-gray-400">Prompt de Contexto Base</label>
                    <textarea
                      rows={4}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full resize-none rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-400">
                  <Calendar size={16} className="text-green-400" /> Integracao Google Agenda
                </h3>
                <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                      <Calendar size={20} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold">Google Calendar</h4>
                      <p className="text-xs text-gray-400">
                        {calendarConnected
                          ? `Conectado em ${calendarUserEmail || 'uma conta autenticada'}`
                          : 'Permite que a IA agende entrevistas automaticamente.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => void connectGoogleCalendar().catch((error) => console.error(error))}
                    className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-gray-200"
                  >
                    <Calendar size={16} />
                    {calendarConnected ? 'Reconectar Conta' : 'Conectar Conta'}
                  </button>
                </div>
              </section>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/5 bg-white/[0.02] p-6">
              <button
                onClick={() => setConfigModalOpen(false)}
                className="rounded-xl bg-white/5 px-6 py-3 text-sm font-bold transition-colors hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleSaveConfig().catch((error) => console.error(error))}
                className="grad-bg flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-lg shadow-purple-500/20 transition-transform hover:scale-105"
              >
                <Save size={16} /> Salvar Configuracoes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppAccountsPage;
