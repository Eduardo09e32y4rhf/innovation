'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, MessageSquareText, Power, QrCode, RefreshCw, Send, Smartphone, Users,
} from 'lucide-react';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Chat, type ChatMessage } from '@/app/lib/api';

export default function WhatsappPage() {
  const status = useQuery(() => api.whatsapp.status(), [], { pollMs: 5000 });
  const isConnected = status.data?.status === 'CONNECTED';

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">WhatsApp</p>
          <h2 className="text-2xl font-black text-slate-950">Comunicacao WhatsApp</h2>
        </div>
        <ConnectionPill status={status.data?.status} phone={status.data?.phone} />
      </header>

      {isConnected ? (
        <ChatWorkspace />
      ) : (
        <ConnectionPanel
          status={status.data?.status}
          qrCode={status.data?.qrCode}
          onRefresh={status.refetch}
        />
      )}
    </div>
  );
}

function ConnectionPill({ status, phone }: { status?: string; phone?: string | null }) {
  const connected = status === 'CONNECTED';
  const connecting = status === 'CONNECTING';
  const color = connected
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : connecting
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';
  const label = connected ? `Conectado${phone ? ` · ${phone}` : ''}` : connecting ? 'Conectando...' : 'Desconectado';
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${color}`}>
      <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : connecting ? 'bg-amber-500' : 'bg-slate-400'}`} />
      {label}
    </span>
  );
}

function QrImage({ value }: { value: string }) {
  // Aceita data URL pronta ou string crua de QR (gera imagem via servico publico).
  const src = value.startsWith('data:')
    ? value
    : `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(value)}`;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="QR Code WhatsApp" className="h-full w-full object-contain" />;
}

function ConnectionPanel({
  status, qrCode, onRefresh,
}: {
  status?: string;
  qrCode?: string | null;
  onRefresh: () => void;
}) {
  const connect = useMutation(() => api.whatsapp.connect(), { onSuccess: onRefresh });

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="ops-card rounded-[8px] border border-slate-200 bg-white p-5 lg:col-span-1">
        <QrCode className="mb-4 text-teal-600" size={24} />
        <h3 className="text-sm font-black text-slate-950">Conectar dispositivo</h3>
        <div className="mt-4 flex aspect-square items-center justify-center overflow-hidden rounded-[8px] border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs text-slate-500">
          {qrCode ? (
            <QrImage value={qrCode} />
          ) : status === 'CONNECTING' ? (
            <span className="flex flex-col items-center gap-2"><Loader2 className="animate-spin text-teal-600" size={22} />Gerando QR Code...</span>
          ) : (
            'Clique em Iniciar conexao para gerar o QR Code'
          )}
        </div>

        {connect.error && (
          <p className="mt-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{connect.error}</p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => connect.mutate().catch(() => {})}
            disabled={connect.loading}
            className="crystal-button inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            {connect.loading ? <Loader2 className="animate-spin" size={14} /> : <Power size={14} />}
            Iniciar conexao
          </button>
          <button onClick={onRefresh} className="btn-outline inline-flex h-10 w-10 items-center justify-center rounded-[8px]">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="ops-card rounded-[8px] border border-slate-200 bg-white p-5">
        <Smartphone className="mb-4 text-teal-600" size={24} />
        <h3 className="text-sm font-black text-slate-950">Como conectar</h3>
        <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
          <li>1. Abra o WhatsApp no celular da empresa.</li>
          <li>2. Va em Aparelhos conectados → Conectar aparelho.</li>
          <li>3. Aponte a camera para o QR Code ao lado.</li>
          <li>4. A sessao fica salva ate ser desconectada aqui.</li>
        </ol>
      </div>

      <div className="ops-card rounded-[8px] border border-slate-200 bg-white p-5">
        <MessageSquareText className="mb-4 text-teal-600" size={24} />
        <h3 className="text-sm font-black text-slate-950">Apos conectar</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          A fila de conversas e o envio de mensagens aparecem automaticamente nesta tela quando o dispositivo estiver conectado.
        </p>
      </div>
    </section>
  );
}

function ChatWorkspace() {
  const chats = useQuery(() => api.whatsapp.chats(), [], { pollMs: 8000 });
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeChat = useMemo(
    () => (chats.data ?? []).find((c) => c.id === activeId) ?? null,
    [chats.data, activeId],
  );

  useEffect(() => {
    if (!activeId && chats.data && chats.data.length > 0) {
      setActiveId(chats.data[0].id);
    }
  }, [chats.data, activeId]);

  return (
    <section className="ops-card grid h-[calc(100vh-220px)] min-h-[480px] grid-cols-1 overflow-hidden rounded-[10px] border border-slate-200 bg-white md:grid-cols-[320px_1fr]">
      <ChatList
        chats={chats.data ?? []}
        loading={chats.loading}
        error={chats.error}
        activeId={activeId}
        onSelect={setActiveId}
        onRefresh={chats.refetch}
      />
      <ChatThread chat={activeChat} />
    </section>
  );
}

function ChatList({
  chats, loading, error, activeId, onSelect, onRefresh,
}: {
  chats: Chat[];
  loading: boolean;
  error: string | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-col border-b border-slate-200 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-black text-slate-950">Conversas</h3>
        <button onClick={onRefresh} className="text-slate-400 hover:text-teal-600">
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && chats.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-slate-400">Carregando conversas...</p>
        )}
        {error && <p className="px-4 py-6 text-center text-xs text-rose-600">{error}</p>}
        {!loading && !error && chats.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-slate-400">Nenhuma conversa ainda.</p>
        )}
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelect(chat.id)}
            className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
              activeId === chat.id ? 'bg-teal-50/60' : ''
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              {chat.isGroup ? <Users size={16} /> : <Smartphone size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-bold text-slate-900">{chat.name}</p>
                <span className="shrink-0 text-[10px] text-slate-400">{chat.time}</span>
              </div>
              <p className="truncate text-[11px] text-slate-500">{chat.lastMessage || '—'}</p>
            </div>
            {chat.unreadCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 text-[10px] font-bold text-white">
                {chat.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatThread({ chat }: { chat: Chat | null }) {
  const messages = useQuery<ChatMessage[]>(
    () => (chat ? api.whatsapp.chatMessages(chat.id) : Promise.resolve([])),
    [chat?.id],
    { enabled: Boolean(chat), pollMs: chat ? 6000 : undefined },
  );
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = useMutation(
    (body: string) => {
      const phone = chat?.isGroup ? chat.id : chat?.id.replace(/@.*$/, '') ?? '';
      return api.whatsapp.sendMessage({ phone, body, contactName: chat?.name });
    },
    {
      onSuccess: () => {
        setDraft('');
        messages.refetch();
      },
    },
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.data]);

  if (!chat) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-slate-400">
        Selecione uma conversa
      </div>
    );
  }

  function handleSend() {
    const body = draft.trim();
    if (!body) return;
    send.mutate(body).catch(() => {});
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          {chat.isGroup ? <Users size={15} /> : <Smartphone size={15} />}
        </div>
        <div>
          <p className="text-xs font-black text-slate-950">{chat.name}</p>
          <p className="text-[10px] text-slate-400">{chat.isGroup ? 'Grupo' : 'Contato'}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50/60 px-4 py-4">
        {messages.loading && (messages.data ?? []).length === 0 && (
          <p className="py-6 text-center text-xs text-slate-400">Carregando mensagens...</p>
        )}
        {messages.error && <p className="py-6 text-center text-xs text-rose-600">{messages.error}</p>}
        {(messages.data ?? []).map((msg) => {
          const fromMe = msg.sender === 'bot';
          return (
            <div key={msg.id} className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-[10px] px-3 py-2 text-xs leading-relaxed ${
                  fromMe ? 'bg-teal-600 text-white' : 'border border-slate-200 bg-white text-slate-800'
                }`}
              >
                {chat.isGroup && !fromMe && msg.participantName && (
                  <p className="mb-0.5 text-[10px] font-bold text-teal-600">{msg.participantName}</p>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.text || '[midia]'}</p>
                <p className={`mt-1 text-right text-[9px] ${fromMe ? 'text-teal-100' : 'text-slate-400'}`}>{msg.time}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {send.error && (
        <p className="border-t border-rose-100 bg-rose-50 px-4 py-1.5 text-[11px] text-rose-700">{send.error}</p>
      )}

      <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Digite uma mensagem..."
          className="h-10 flex-1 rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
        />
        <button
          onClick={handleSend}
          disabled={send.loading || !draft.trim()}
          className="crystal-button inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-white disabled:opacity-50"
        >
          {send.loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
