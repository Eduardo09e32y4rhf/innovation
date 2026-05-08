'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  Phone,
  Power,
  QrCode,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { getApiBaseUrl, getAuthHeaders } from '../api';

type WhatsappStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR_CODE' | 'CONNECTED';

type WhatsappPayload = {
  status?: string;
  qrCode?: string | null;
  phone?: string | null;
  displayName?: string | null;
  config?: {
    aiEngine?: string;
    prompt?: string;
    temperature?: number;
  };
};

function unwrap<T>(payload: unknown): T {
  const raw = payload as any;
  return (raw?.data ?? raw) as T;
}

function normalizeStatus(status: unknown): WhatsappStatus {
  const value = String(status || 'DISCONNECTED').toUpperCase();
  if (value === 'CONNECTED' || value === 'CONNECTING' || value === 'QR_CODE') return value;
  return 'DISCONNECTED';
}

function formatPhone(phone?: string | null) {
  if (!phone) return 'Numero ainda nao identificado';
  const digits = phone.replace(/\D/g, '');
  return digits ? `+${digits}` : phone;
}

const statusCopy: Record<WhatsappStatus, { label: string; tone: string; icon: React.ElementType; description: string }> = {
  CONNECTED: {
    label: 'Conectado',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: Wifi,
    description: 'A sessao esta ativa e pronta para enviar e receber mensagens.',
  },
  QR_CODE: {
    label: 'Aguardando leitura do QR',
    tone: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    icon: QrCode,
    description: 'Abra o WhatsApp no celular e escaneie o QR para concluir.',
  },
  CONNECTING: {
    label: 'Conectando',
    tone: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: Loader2,
    description: 'Estamos abrindo a sessao e gerando o QR Code.',
  },
  DISCONNECTED: {
    label: 'Desconectado',
    tone: 'border-rose-200 bg-rose-50 text-rose-800',
    icon: WifiOff,
    description: 'Nenhum aparelho esta conectado agora.',
  },
};

export default function WhatsAppAccountsPage() {
  const [status, setStatus] = useState<WhatsappStatus>('DISCONNECTED');
  const [qrCode, setQrCode] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Ola! Sua integracao WhatsApp da Innovation IA esta funcionando.');
  const [sendingTest, setSendingTest] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const statusInfo = statusCopy[status];
  const StatusIcon = statusInfo.icon;

  const isConnected = status === 'CONNECTED';
  const isWaitingQr = status === 'QR_CODE' || status === 'CONNECTING';

  const loadStatus = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/communication/whatsapp/status`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const payload = unwrap<WhatsappPayload>(await response.json());
      setStatus(normalizeStatus(payload.status));
      setQrCode(payload.qrCode || '');
      setPhone(payload.phone || null);
      setDisplayName(payload.displayName || null);
      setLastUpdated(new Date());
      setError('');
    } catch {
      setStatus('DISCONNECTED');
      setError('Nao foi possivel falar com o backend do WhatsApp. Verifique se a API esta no ar.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const startConnection = async () => {
    setConnecting(true);
    setFeedback('');
    setError('');
    setStatus('CONNECTING');
    setQrCode('');
    try {
      const response = await fetch(`${getApiBaseUrl()}/communication/whatsapp/connect`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Connect ${response.status}`);
      setFeedback('Sessao iniciada. Aguarde o QR aparecer e escaneie pelo WhatsApp do celular.');
      await loadStatus(true);
    } catch {
      setError('Nao foi possivel iniciar a conexao WhatsApp. O motor de QR pode estar indisponivel.');
      setStatus('DISCONNECTED');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    setDisconnecting(true);
    setFeedback('');
    setError('');
    try {
      const response = await fetch(`${getApiBaseUrl()}/communication/whatsapp/disconnect`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Disconnect ${response.status}`);
      setFeedback('WhatsApp desconectado com sucesso.');
      await loadStatus(true);
    } catch {
      setError('Nao foi possivel desconectar agora.');
    } finally {
      setDisconnecting(false);
    }
  };

  const sendTest = async () => {
    setSendingTest(true);
    setFeedback('');
    setError('');
    try {
      const response = await fetch(`${getApiBaseUrl()}/communication/messages/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          phone: testPhone,
          body: testMessage,
          contactName: 'Teste WhatsApp',
        }),
      });
      if (!response.ok) throw new Error(`Send ${response.status}`);
      setFeedback('Mensagem de teste enviada. A conversa tambem fica registrada no backend.');
    } catch {
      setError('Falha ao enviar teste. Confirme que o WhatsApp esta conectado e que o numero tem DDI/DDD.');
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    void loadStatus();
    const interval = setInterval(() => {
      void loadStatus(true);
    }, isConnected ? 8000 : 1800);
    return () => clearInterval(interval);
  }, [isConnected]);

  const steps = useMemo(
    () => [
      { title: 'Abra o WhatsApp', desc: 'No celular, entre em Aparelhos conectados.' },
      { title: 'Toque em conectar', desc: 'Use Conectar um aparelho para abrir a camera.' },
      { title: 'Escaneie o QR', desc: 'Aponte para o QR desta tela e aguarde o status conectado.' },
    ],
    [],
  );

  return (
    <div className="space-y-5 pb-8">
      <section className="overflow-hidden rounded-[24px] border border-slate-950 bg-[#07111f] p-6 text-white shadow-[0_24px_60px_rgba(2,6,23,0.24)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-teal-200">WhatsApp</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-white">Conexao por QR Code</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Pareie o aparelho pelo QR, acompanhe status em tempo real e valide envio antes de liberar automacoes.
            </p>
          </div>
          <div className={`flex items-center gap-3 rounded-[18px] border px-4 py-3 ${statusInfo.tone}`}>
            <StatusIcon size={20} className={status === 'CONNECTING' ? 'animate-spin' : ''} />
            <div>
              <p className="text-sm font-black">{statusInfo.label}</p>
              <p className="text-xs font-semibold opacity-80">{statusInfo.description}</p>
            </div>
          </div>
        </div>
      </section>

      {feedback ? <Notice tone="success" text={feedback} /> : null}
      {error ? <Notice tone="error" text={error} /> : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <main className="space-y-5">
          <section className="rounded-[22px] border border-slate-300 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.10)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#07111f] text-white shadow-[0_14px_28px_rgba(2,6,23,0.22)]">
                  <Smartphone size={24} />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-950">{displayName || 'Instancia WhatsApp'}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{formatPhone(phone)}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    Atualizado {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'agora'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void loadStatus()}
                  disabled={loading}
                  className="flex h-11 items-center gap-2 rounded-[14px] border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 hover:border-slate-950 disabled:opacity-60"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                  Atualizar
                </button>
                {isConnected ? (
                  <button
                    onClick={() => void disconnect()}
                    disabled={disconnecting}
                    className="flex h-11 items-center gap-2 rounded-[14px] border border-rose-200 bg-rose-50 px-4 text-xs font-black text-rose-800 disabled:opacity-60"
                  >
                    <Power size={15} />
                    {disconnecting ? 'Desconectando...' : 'Desconectar'}
                  </button>
                ) : (
                  <button
                    onClick={() => void startConnection()}
                    disabled={connecting}
                    className="flex h-11 items-center gap-2 rounded-[14px] bg-[#07111f] px-4 text-xs font-black text-white shadow-[0_12px_24px_rgba(2,6,23,0.20)] disabled:opacity-60"
                  >
                    {connecting ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />}
                    {connecting ? 'Conectando...' : 'Conectar por QR'}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <div className="rounded-[22px] border border-slate-300 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.10)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">QR Code</p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">Pareamento do aparelho</h2>
                </div>
                {isWaitingQr ? <Clock3 className="text-cyan-600" size={20} /> : isConnected ? <CheckCircle2 className="text-emerald-600" size={20} /> : <QrCode className="text-slate-400" size={20} />}
              </div>

              <div className="mt-5 flex min-h-[310px] items-center justify-center rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                {qrCode ? (
                  <img src={qrCode} alt="QR Code do WhatsApp" className="h-64 w-64 rounded-[16px] bg-white p-2 shadow-[0_16px_38px_rgba(15,23,42,0.16)]" />
                ) : (
                  <div className="text-center">
                    {isConnected ? <CheckCircle2 className="mx-auto text-emerald-600" size={36} /> : <QrCode className="mx-auto text-slate-400" size={36} />}
                    <p className="mt-3 text-sm font-black text-slate-950">
                      {isConnected ? 'Aparelho conectado' : connecting || status === 'CONNECTING' ? 'Gerando QR Code...' : 'Clique em conectar'}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {isConnected ? 'Nao precisa escanear novamente.' : 'O QR aparece aqui assim que a sessao abrir.'}
                    </p>
                  </div>
                )}
              </div>

              <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <ShieldCheck size={14} className="text-emerald-600" />
                Use apenas o aparelho autorizado da empresa.
              </p>
            </div>

            <div className="rounded-[22px] border border-slate-300 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.10)]">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Como conectar</p>
              <div className="mt-4 grid gap-3">
                {steps.map((step, index) => (
                  <div key={step.title} className="flex gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#07111f] text-xs font-black text-white">{index + 1}</span>
                    <div>
                      <p className="text-sm font-black text-slate-950">{step.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
                <strong>Nota tecnica:</strong> QR Code e aparelho conectado usam o fluxo de pareamento do WhatsApp Web. A API oficial Cloud da Meta usa token e webhook, sem QR Code.
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[22px] border border-slate-300 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.10)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#07111f] text-white">
                <Send size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950">Teste de envio</p>
                <p className="text-xs font-semibold text-slate-500">Valide a sessao antes de ligar automacoes.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Telefone</span>
                <div className="mt-1 flex h-11 items-center gap-2 rounded-[14px] border border-slate-300 bg-white px-3 focus-within:border-slate-950">
                  <Phone size={15} className="text-slate-400" />
                  <input
                    value={testPhone}
                    onChange={(event) => setTestPhone(event.target.value)}
                    placeholder="+55 11 99999-9999"
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Mensagem</span>
                <textarea
                  value={testMessage}
                  onChange={(event) => setTestMessage(event.target.value)}
                  rows={5}
                  className="mt-1 w-full resize-none rounded-[14px] border border-slate-300 bg-white p-3 text-sm font-semibold leading-6 text-slate-900 outline-none focus:border-slate-950"
                />
              </label>
              <button
                onClick={() => void sendTest()}
                disabled={!isConnected || sendingTest || !testPhone.trim() || !testMessage.trim()}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#07111f] px-4 text-xs font-black text-white shadow-[0_12px_24px_rgba(2,6,23,0.20)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendingTest ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {sendingTest ? 'Enviando...' : 'Enviar teste'}
              </button>
            </div>
          </section>

          <section className="rounded-[22px] border border-slate-300 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.10)]">
            <p className="text-sm font-black text-slate-950">Proximos modulos</p>
            <div className="mt-4 grid gap-2">
              <PanelLink href="/dashboard/whatsapp/chat" icon={<MessageCircle size={15} />} label="Abrir conversas" />
              <PanelLink href="/dashboard/whatsapp/contacts" icon={<Smartphone size={15} />} label="Contatos" />
              <PanelLink href="/dashboard/whatsapp/builder" icon={<Settings size={15} />} label="IA e automacoes" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Notice({ tone, text }: { tone: 'success' | 'error'; text: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-[18px] border px-4 py-3 text-sm font-semibold shadow-sm ${
        tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
      }`}
    >
      {tone === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {text}
    </div>
  );
}

function PanelLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex h-11 items-center gap-2 rounded-[14px] border border-slate-300 px-3 text-xs font-black text-slate-700 hover:border-slate-950">
      {icon}
      {label}
    </Link>
  );
}
