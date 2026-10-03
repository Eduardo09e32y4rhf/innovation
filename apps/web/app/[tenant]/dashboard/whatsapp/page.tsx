'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Paperclip, Power, RefreshCw, Send, Smartphone, Users, X } from 'lucide-react';
import { Button, PageHeader, ConfirmDialog } from '@/app/components/ui';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '../platform/_components/use-platform-query';
import { api, type Chat, type ChatMessage } from '@/app/lib/api';

export default function WhatsappPage() {
  const { user } = useAuth();
  const allowed = String(user?.profile || user?.role || '').toUpperCase() === 'DEV';
  const status = useQuery(() => api.whatsapp.status(), [], { enabled: allowed, pollMs: 5000 });
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const connected = status.data?.status === 'CONNECTED';
  const connect = useMutation(() => api.whatsapp.connect(), { onSuccess: status.refetch });
  const disconnect = useMutation(() => api.whatsapp.disconnect(), { onSuccess: () => { setConfirmDisconnect(false); status.refetch(); } });
  if (!user) return <LoadingState label="Carregando autorização..." />;
  if (!allowed) return <section className="card-v2 p-5"><h1 className="text-xl font-semibold">WhatsApp</h1><p className="mt-2 text-sm text-fg-mut">A integração está disponível somente para DEV, conforme autorização do servidor.</p></section>;
  return <div className="min-w-0 space-y-4">
    <PageHeader title="WhatsApp" subtitle="Conecte o dispositivo da empresa e acompanhe as conversas." actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={status.refetch}><RefreshCw size={18} /> Atualizar conexão</Button>{connected && <Button variant="danger" onClick={() => setConfirmDisconnect(true)} isLoading={disconnect.loading}><Power size={18} /> Desconectar</Button>}</div>} />
    <p role="status" className="text-sm font-medium text-fg">{status.loading && !status.data ? 'Consultando conexão...' : status.data?.status === 'CONNECTED' ? `Conectado${status.data.phone ? ' · ' + status.data.phone : ''}` : status.data?.status === 'CONNECTING' ? 'Conectando...' : status.data?.status === 'QR_CODE' ? 'Aguardando leitura do QR code' : 'Desconectado'}</p>
    {status.error && <ErrorState message={status.error} onRetry={status.refetch} />}
    {disconnect.error && <p role="alert" className="text-sm text-danger">{disconnect.error}</p>}
    {connected ? <ChatWorkspace /> : <section className="card-v2 grid gap-5 p-4 sm:p-5 lg:grid-cols-2">
      <div><h2 className="text-base font-semibold text-fg">Conectar dispositivo</h2><div className="mt-3 flex aspect-square max-w-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-white p-3">
        {status.data?.qrCode?.startsWith('data:image/') ? <img src={status.data.qrCode} alt="QR code para conectar o WhatsApp da empresa" className="h-full w-full object-contain" /> : <p className="text-center text-sm text-fg-mut">{status.data?.qrCode ? 'QR code inválido. Atualize a conexão para solicitar uma nova imagem.' : 'Inicie a conexão para gerar o QR code.'}</p>}
      </div><Button className="mt-3" onClick={() => void connect.mutate().catch(() => undefined)} isLoading={connect.loading} disabled={status.data?.status === 'CONNECTING'}><Power size={18} /> Iniciar conexão</Button>{connect.error && <p role="alert" className="mt-2 text-sm text-danger">{connect.error}</p>}</div>
      <div className="text-sm text-fg-mut"><h2 className="text-base font-semibold text-fg">Como conectar</h2><ol className="mt-3 list-decimal space-y-3 pl-5"><li>Abra o WhatsApp no celular da empresa.</li><li>Em Aparelhos conectados, escolha Conectar aparelho.</li><li>Aponte a câmera para o QR code.</li><li>As conversas ficam disponíveis após a confirmação da conexão.</li></ol><p className="mt-4">A sessão permanece vinculada à empresa até ser desconectada.</p></div>
    </section>}
    <ConfirmDialog isOpen={confirmDisconnect} title="Desconectar WhatsApp?" description="O envio e a atualização de conversas serão interrompidos. Será necessário conectar o dispositivo novamente." confirmText="Desconectar" onClose={() => setConfirmDisconnect(false)} onConfirm={() => disconnect.mutate().catch(() => undefined)} isLoading={disconnect.loading} />
  </div>;
}

function Avatar({ chat }: { chat: Chat }) {
  const [failed, setFailed] = useState(false);
  return <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-sub text-fg-mut">{chat.isGroup ? <Users size={20} /> : <Smartphone size={20} />}{chat.avatarUrl && !failed && <img src={chat.avatarUrl} alt="" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />}</span>;
}

function ChatWorkspace() {
  const chats = useQuery(() => api.whatsapp.chats(), [], { pollMs: 8000 });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'groups'>('all');
  const active = (chats.data || []).find(chat => chat.id === activeId);
  const filtered = useMemo(() => (chats.data || []).filter(chat => chat.name.toLowerCase().includes(search.trim().toLowerCase()) && (filter !== 'unread' || chat.unreadCount > 0) && (filter !== 'groups' || chat.isGroup)), [chats.data, search, filter]);
  useEffect(() => { if (chats.data && activeId && !chats.data.some(chat => chat.id === activeId)) setActiveId(null); }, [chats.data, activeId]);
  return <section className="card-v2 flex h-[min(720px,calc(100dvh-180px))] min-h-[360px] min-w-0 overflow-hidden">
    <div className={`${activeId ? 'hidden md:flex' : 'flex'} w-full min-w-0 flex-col border-r border-border md:w-[32%] md:min-w-[220px] md:max-w-[320px]`}>
      <div className="space-y-2 border-b border-border p-3"><div className="flex items-center justify-between gap-2"><h2 className="font-semibold text-fg">Conversas</h2><Button variant="icon" aria-label="Atualizar conversas" onClick={chats.refetch}><RefreshCw size={18} /></Button></div><label className="block text-sm text-fg">Buscar conversa<input className="input-v2 mt-1 w-full" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome do contato ou grupo" /></label><div className="flex flex-wrap gap-1">{([['all', 'Todas'], ['unread', 'Não lidas'], ['groups', 'Grupos']] as const).map(([value, label]) => <Button key={value} variant={filter === value ? 'secondary' : 'ghost'} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</Button>)}</div></div>
      <div className="min-h-0 flex-1 overflow-y-auto">{chats.error && <ErrorState message={chats.error} onRetry={chats.refetch} />}{chats.loading && !chats.data && <LoadingState label="Carregando conversas..." />}{!chats.loading && !chats.error && !filtered.length && <p className="p-4 text-sm text-fg-mut">Nenhuma conversa para estes filtros.</p>}{filtered.map(chat => <button type="button" key={chat.id} aria-pressed={activeId === chat.id} onClick={() => setActiveId(chat.id)} className={`flex min-h-20 w-full items-center gap-3 border-b border-border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${activeId === chat.id ? 'bg-brand/10' : 'hover:bg-bg-sub'}`}><Avatar chat={chat} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-fg">{chat.name}</span><span className="block truncate text-sm text-fg-mut">{chat.lastMessage}</span></span><span className="shrink-0 text-xs text-fg-mut">{chat.time}{chat.unreadCount > 0 && <span className="mt-1 block rounded-full bg-brand px-2 py-1 text-center text-white" aria-label={`${chat.unreadCount} mensagens não lidas`}>{chat.unreadCount}</span>}</span></button>)}</div>
    </div>
    <div className={`${activeId ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-1 flex-col`}>{active ? <ChatThread key={active.id} chat={active} onBack={() => setActiveId(null)} /> : <p className="m-auto p-5 text-center text-sm text-fg-mut">Selecione uma conversa.</p>}</div>
  </section>;
}

function ChatThread({ chat, onBack }: { chat: Chat; onBack: () => void }) {
  const messages = useQuery<ChatMessage[]>(() => api.whatsapp.chatMessages(chat.id), [chat.id], { pollMs: 6000 });
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<{ file: File; base64: string } | null>(null);
  const [fileError, setFileError] = useState('');
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sendLock = useRef(false);
  const send = useMutation((payload: { body: string; media?: { base64: string; mimeType: string; name: string } }) => api.whatsapp.sendMessage({ phone: chat.isGroup ? chat.id : chat.id.replace(/@.*$/, ''), contactName: chat.name, ...payload } as any), { onSuccess: () => { setDraft(''); setAttachment(null); messages.refetch(); } });
  useEffect(() => { const list = listRef.current; if (list) list.scrollTop = list.scrollHeight; }, [messages.data?.length]);

  async function handleSend() {
    if (sendLock.current || reading || (!draft.trim() && !attachment)) return;
    sendLock.current = true;
    try { await send.mutate({ body: draft.trim(), media: attachment ? { base64: attachment.base64, mimeType: attachment.file.type || 'application/octet-stream', name: attachment.file.name } : undefined }); }
    catch { /* O erro e o rascunho permanecem visíveis. */ }
    finally { sendLock.current = false; }
  }
  function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileError('');
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => { setAttachment({ file, base64: String(reader.result) }); setReading(false); };
    reader.onerror = () => { setFileError('Não foi possível ler o arquivo. Selecione novamente.'); setReading(false); };
    reader.readAsDataURL(file);
  }
  return <>
    <div className="flex shrink-0 items-center gap-2 border-b border-border p-3"><Button variant="icon" onClick={onBack} aria-label="Voltar às conversas" className="md:hidden"><ArrowLeft size={20} /></Button><Avatar chat={chat} /><div className="min-w-0"><h2 className="truncate font-semibold text-fg">{chat.name}</h2><p className="text-xs text-fg-mut">{chat.isGroup ? 'Grupo' : 'Contato WhatsApp'}</p></div></div>
    <div ref={listRef} role="log" aria-label={`Mensagens de ${chat.name}`} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-bg-sub p-3 sm:p-4">
      {messages.loading && !messages.data && <LoadingState label="Carregando mensagens..." />}{messages.error && <ErrorState message={messages.error} onRetry={messages.refetch} />}
      {(messages.data || []).map(message => { const media = message.media as { url?: string; type?: string } | undefined; return <div key={message.id} className={`flex ${message.sender === 'bot' ? 'justify-end' : 'justify-start'}`}><article className={`max-w-[90%] min-w-0 rounded-xl border border-border p-3 sm:max-w-[80%] ${message.sender === 'bot' ? 'bg-brand/10' : 'bg-white'}`}>{chat.isGroup && message.participantName && <p className="mb-1 text-xs font-semibold text-brand">{message.participantName}</p>}{media?.url && (media.type === 'image' ? <img src={media.url} alt="Imagem enviada na conversa" className="mb-2 max-h-64 max-w-full rounded-lg" /> : media.type === 'video' ? <video src={media.url} controls className="mb-2 max-h-64 max-w-full" /> : media.type === 'audio' ? <audio src={media.url} controls className="max-w-full" /> : <a href={media.url} target="_blank" rel="noreferrer" className="btn btn-outline mb-2"><Paperclip size={16} /> Abrir arquivo</a>)}<p className="whitespace-pre-wrap break-words text-sm text-fg">{message.text}</p><p className="mt-1 text-right text-xs text-fg-mut">{message.time}</p></article></div>; })}
    </div>
    <form onSubmit={event => { event.preventDefault(); void handleSend(); }} className="shrink-0 space-y-2 border-t border-border p-3">
      {send.error && <p role="alert" className="text-sm text-danger">{send.error}</p>}{fileError && <p role="alert" className="text-sm text-danger">{fileError}</p>}
      {attachment && <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-bg-sub p-2"><span className="break-all text-sm text-fg">{attachment.file.name}</span><Button variant="icon" aria-label="Remover anexo" disabled={send.loading} onClick={() => setAttachment(null)}><X size={18} /></Button></div>}
      <div className="flex min-w-0 items-end gap-2"><input ref={fileRef} type="file" className="sr-only" tabIndex={-1} onChange={selectFile} aria-label="Selecionar anexo" /><Button variant="icon" type="button" aria-label="Anexar arquivo" onClick={() => fileRef.current?.click()} disabled={send.loading || reading}><Paperclip size={20} /></Button><label className="min-w-0 flex-1"><span className="sr-only">Mensagem ou legenda</span><textarea rows={2} className="input-v2 w-full resize-none text-base" value={draft} disabled={send.loading} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void handleSend(); } }} placeholder={attachment ? 'Adicione uma legenda...' : 'Digite uma mensagem'} /></label><Button type="submit" aria-label="Enviar mensagem" isLoading={send.loading} disabled={reading || (!draft.trim() && !attachment)}><Send size={20} /></Button></div>{reading && <p role="status" className="text-sm text-fg-mut">Lendo anexo...</p>}
    </form>
  </>;
}
