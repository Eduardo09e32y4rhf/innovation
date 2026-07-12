'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, MessageSquareText, Power, QrCode, RefreshCw, Send, Smartphone, Users,
} from 'lucide-react';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Chat, type ChatMessage } from '@/app/lib/api';

export default function WhatsappPage() {
  const status = useQuery(() => api.whatsapp.status(), [], { pollMs: 5000 });
  const isConnected = status.data?.status === 'CONNECTED' || (status.data?.status === 'CONNECTING' && Boolean(status.data?.phone));

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
  const label = connected ? `Conectado${phone ? ` - ${phone}` : ''}` : connecting ? 'Conectando...' : 'Desconectado';
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
          <li>2. Va em Aparelhos conectados e toque em Conectar aparelho.</li>
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
    <section className="relative flex h-[calc(100vh-220px)] min-h-[480px] w-full overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-sm">
      <ChatList
        chats={chats.data ?? []}
        loading={chats.loading}
        error={chats.error}
        activeId={activeId}
        onSelect={setActiveId}
        onRefresh={chats.refetch}
        className={`${activeId ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col min-h-0 border-r border-slate-200 bg-white md:w-[400px]`}
      />
      <ChatThread 
        chat={activeChat} 
        onBack={() => setActiveId(null)} 
        className={`${activeId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-h-0 min-w-0 bg-[#efeae2]`}
      />
    </section>
  );
}

function ChatList({
  chats, loading, error, activeId, onSelect, onRefresh, className
}: {
  chats: Chat[];
  loading: boolean;
  error: string | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  className?: string;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'groups'>('all');

  const filtered = chats.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'unread' && c.unreadCount === 0) return false;
    if (filter === 'groups' && !c.isGroup) return false;
    return true;
  });

  return (
    <div className={className || "flex min-h-0 flex-col border-b border-slate-200 md:border-b-0 md:border-r"}>
      {/* WhatsApp Web Style Header */}
      <div className="flex h-[59px] shrink-0 items-center justify-between bg-[#f0f2f5] px-4">
        <h3 className="text-xl font-bold text-[#111b21]">Conversas</h3>
        <div className="flex items-center gap-4 text-[#54656f]">
          <button onClick={onRefresh} className="hover:text-teal-600 transition" title="Atualizar">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="shrink-0 bg-white p-2 border-b border-slate-100">
        <div className="flex h-[35px] items-center gap-3 rounded-[8px] bg-[#f0f2f5] px-3">
          <MessageSquareText size={16} className="text-[#54656f]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar ou começar uma nova conversa"
            className="flex-1 bg-transparent text-[14px] text-[#111b21] outline-none placeholder:text-[#54656f]"
          />
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2 scrollbar-hide">
        <button
          onClick={() => setFilter('all')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
            filter === 'all' ? 'bg-[#e7fce3] text-[#008069]' : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
          }`}
        >
          Tudo
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
            filter === 'unread' ? 'bg-[#e7fce3] text-[#008069]' : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
          }`}
        >
          Não lidas
        </button>
        <button
          onClick={() => setFilter('groups')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
            filter === 'groups' ? 'bg-[#e7fce3] text-[#008069]' : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
          }`}
        >
          Grupos
        </button>
      </div>

      {/* Chat List */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {loading && chats.length === 0 && (
          <p className="px-4 py-6 text-center text-[13px] text-slate-400">Carregando conversas...</p>
        )}
        {error && <p className="px-4 py-6 text-center text-[13px] text-rose-600">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-[13px] text-slate-400">Nenhuma conversa encontrada.</p>
        )}
        
        {filtered.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelect(chat.id)}
            className={`flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-[#f5f6f6] ${
              activeId === chat.id ? 'bg-[#f0f2f5]' : ''
            }`}
          >
            <div className="flex h-[49px] w-[49px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dfe5e7] text-white">
              {chat.avatarUrl ? (
                <img src={chat.avatarUrl} alt={chat.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : chat.isGroup ? (
                <Users size={24} />
              ) : (
                <Smartphone size={24} />
              )}
            </div>
            <div className="min-w-0 flex-1 border-b border-[#f0f2f5] pb-3 pr-2 pt-1 h-full flex flex-col justify-center">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[16px] text-[#111b21]">{chat.name}</p>
                <span className={`shrink-0 text-[12px] ${chat.unreadCount > 0 ? 'text-[#25D366]' : 'text-[#667781]'}`}>
                  {chat.time}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className={`truncate text-[13px] ${chat.unreadCount > 0 ? 'font-medium text-[#111b21]' : 'text-[#667781]'}`}>
                  {chat.lastMessage || '--'}
                </p>
                {chat.unreadCount > 0 && (
                  <span className="ml-2 inline-flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#25D366] px-1.5 text-[11px] font-bold text-white">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatThread({ chat, onBack, className }: { chat: Chat | null; onBack: () => void; className?: string }) {
  const messages = useQuery<ChatMessage[]>(
    () => (chat ? api.whatsapp.chatMessages(chat.id) : Promise.resolve([])),
    [chat?.id],
    { enabled: Boolean(chat), pollMs: chat ? 6000 : undefined },
  );
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<{ file: File; base64: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const send = useMutation(
    (payload: { body: string; media?: { base64: string; mimeType: string; name: string } }) => {
      const phone = chat?.isGroup ? chat.id : chat?.id.replace(/@.*$/, '') ?? '';
      return api.whatsapp.sendMessage({ phone, body: payload.body, contactName: chat?.name, media: payload.media });
    },
    {
      onSuccess: () => {
        setDraft('');
        setAttachment(null);
        messages.refetch();
      },
    },
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.data]);

  if (!chat) {
    return (
      <div className={`${className || "flex min-h-0 flex-1"} items-center justify-center text-sm text-slate-400`}>
        Selecione uma conversa
      </div>
    );
  }

  function handleSend() {
    const body = draft.trim();
    if (!body && !attachment) return;
    
    let mediaPayload;
    if (attachment) {
      mediaPayload = {
        base64: attachment.base64,
        mimeType: attachment.file.type || 'application/octet-stream',
        name: attachment.file.name,
      };
    }
    
    send.mutate({ body, media: mediaPayload }).catch(() => {});
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachment({ file, base64: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className={className || "flex min-h-0 flex-1 flex-col relative"}>
      {/* WhatsApp Web Style Chat Header */}
      <div className="flex h-[59px] shrink-0 items-center gap-3 bg-[#f0f2f5] px-4">
        <button onClick={onBack} className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dfe5e7] text-white">
          {chat.avatarUrl ? (
            <img src={chat.avatarUrl} alt={chat.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : chat.isGroup ? (
            <Users size={20} />
          ) : (
            <Smartphone size={20} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-medium text-[#111b21]">{chat.name}</p>
          <p className="truncate text-[13px] text-[#667781]">{chat.isGroup ? 'Grupo' : 'Contato WhatsApp'}</p>
        </div>
      </div>

      <div 
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-[5%] py-4" 
        style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', backgroundRepeat: 'repeat', opacity: 0.8 }}
      >
        {messages.loading && (messages.data ?? []).length === 0 && (
          <div className="flex justify-center py-6">
            <span className="rounded-lg bg-white/80 px-3 py-1 text-[12.5px] text-[#54656f] shadow-sm">Carregando mensagens...</span>
          </div>
        )}
        {messages.error && (
          <div className="flex justify-center py-6">
            <span className="rounded-lg bg-white/80 px-3 py-1 text-[12.5px] text-rose-600 shadow-sm">{messages.error}</span>
          </div>
        )}
        {(messages.data ?? []).map((msg, index, array) => {
          const fromMe = msg.sender === 'bot';
          const prevMsg = array[index - 1];
          const isConsecutive = prevMsg && prevMsg.sender === msg.sender && prevMsg.participantId === msg.participantId;
          
          return (
            <div key={msg.id} className={`flex ${fromMe ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-[2px]' : 'mt-[12px]'}`}>
              <div
                className={`relative max-w-[85%] sm:max-w-[75%] px-[9px] py-[6px] text-[14.5px] leading-[19px] shadow-[0_1px_0.5px_rgba(11,20,26,.13)] ${
                  fromMe 
                    ? 'bg-[#d9fdd3] text-[#111b21] rounded-l-lg rounded-br-lg' 
                    : 'bg-white text-[#111b21] rounded-r-lg rounded-bl-lg'
                } ${!isConsecutive && fromMe ? 'rounded-tr-none' : ''} ${!isConsecutive && !fromMe ? 'rounded-tl-none' : ''}`}
              >
                {chat.isGroup && !fromMe && msg.participantName && !isConsecutive && (
                  <p className="mb-0.5 text-[12.5px] font-medium text-[#027eb5]">{msg.participantName}</p>
                )}
                
                {msg.media?.url && msg.media.type === 'image' && (
                  <img src={msg.media.url} alt="Imagem" className="mb-1 max-h-64 rounded-[6px] object-contain" />
                )}
                {msg.media?.url && msg.media.type === 'video' && (
                  <video src={msg.media.url} controls className="mb-1 max-h-64 rounded-[6px] object-contain" />
                )}
                {msg.media?.url && msg.media.type === 'audio' && (
                  <audio src={msg.media.url} controls className="mb-1 max-w-full h-[40px]" />
                )}
                
                <div className="flex items-end gap-3 flex-wrap">
                  {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                  <span className={`ml-auto float-right translate-y-[3px] text-[11px] leading-[15px] ${fromMe ? 'text-[#667781]' : 'text-[#667781]'}`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {send.error && (
        <p className="shrink-0 border-t border-rose-100 bg-rose-50 px-4 py-1.5 text-[11px] text-rose-700">{send.error}</p>
      )}

      <div className="flex shrink-0 items-center gap-3 bg-[#f0f2f5] px-4 py-2 min-h-[62px]">
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
        <button className="text-[#54656f] hover:text-[#111b21] transition">
          <svg viewBox="0 0 24 24" width="24" height="24" className=""><path fill="currentColor" d="M12 20.664a9.163 9.163 0 0 1-6.521-2.702.977.977 0 0 1 1.381-1.381 7.269 7.269 0 0 0 10.024.244.977.977 0 0 1 1.313 1.445A9.192 9.192 0 0 1 12 20.664zm7.965-6.112a.977.977 0 0 1-.944-1.229 7.26 7.26 0 0 0-4.8-8.804.977.977 0 0 1 .594-1.86 9.212 9.212 0 0 1 6.092 11.169.976.976 0 0 1-.942.724zm-16.025-.39a.977.977 0 0 1-.953-.769 9.21 9.21 0 0 1 6.626-10.86.977.977 0 1 1 .507 1.886 7.259 7.259 0 0 0-5.225 8.563.978.978 0 0 1-.955 1.18z"></path></svg>
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="text-[#54656f] hover:text-[#111b21] transition" title="Anexar">
          <svg viewBox="0 0 24 24" width="24" height="24" className=""><path fill="currentColor" d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.35 8.469 4.35v7.061c0 2.001 1.53 3.531 3.531 3.531zM8.95 14.66c.655.625 1.547 1.015 2.529 1.082V20h1.04v-4.258c.982-.067 1.874-.457 2.529-1.082a.983.983 0 0 1 1.353 1.425c-.947.904-2.247 1.468-3.665 1.564V22h-1.47v-4.351c-1.418-.096-2.718-.66-3.665-1.564a.983.983 0 1 1 1.353-1.425z"></path></svg>
        </button>
        
        <div className="flex-1 bg-white rounded-lg flex items-center shadow-sm relative">
          {attachment && (
            <div className="absolute bottom-[110%] left-0 z-10 flex items-center gap-3 rounded-lg bg-white p-3 shadow-md border border-slate-200">
              {attachment.file.type.startsWith('image/') ? (
                <img src={attachment.base64} alt="Preview" className="h-16 w-16 rounded object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-500 text-center break-all">
                  {attachment.file.name}
                </div>
              )}
              <button onClick={() => setAttachment(null)} className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={attachment ? "Adicione uma legenda..." : "Digite uma mensagem"}
            className="w-full h-11 bg-transparent px-4 py-2 text-[15px] text-[#111b21] outline-none placeholder:text-[#8696a0]"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={send.loading || (!draft.trim() && !attachment)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] transition hover:text-[#111b21] disabled:opacity-50"
        >
          {send.loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={24} />}
        </button>
      </div>
    </div>
  );
}
