'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  CheckCheck,
  Contact,
  Group,
  Loader2,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Phone,
  Power,
  Search,
  Send,
  Smile,
  Video,
  Wifi,
  WifiOff,
  Workflow,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl, getAuthHeaders } from '../api';

type ChatContact = {
  id: string;
  name: string;
  isGroup?: boolean;
  unreadCount?: number;
  time?: string;
  lastMessage?: string;
  avatarUrl?: string | null;
};

type ChatMessage = {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  read: boolean;
  participantId?: string;
  participantName?: string;
  media?: {
    type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
    mimeType?: string;
    fileName?: string;
    url?: string;
  } | null;
};

type SendMessagePayload = {
  externalId?: string | null;
};

type WhatsappStatusPayload = {
  status?: string;
};

const DEFAULT_PHONE_PREFIX = '+55 ';
const INITIAL_VISIBLE_MESSAGES = 60;
const LOAD_OLDER_STEP = 40;

function unwrap<T>(payload: unknown): T {
  const raw = payload as any;
  return (raw?.data ?? raw) as T;
}

function contactInitial(contact?: ChatContact | null) {
  const label = contactDisplayName(contact);
  return label.trim().charAt(0).toUpperCase() || '?';
}

function hasSendablePhone(phoneValue: string) {
  return phoneValue.replace(/\D/g, '').length > 2;
}

function isGroupChat(id?: string) {
  return String(id || '').endsWith('@g.us');
}

function isGroupContact(contact?: ChatContact | null) {
  return Boolean(contact?.isGroup || isGroupChat(contact?.id));
}

function groupDisplayName(contact?: ChatContact | null) {
  const name = String(contact?.name || '').trim();
  if (name && !looksLikeRawWhatsappId(name)) return name;
  return 'Grupo do WhatsApp';
}

function formatWhatsappPhone(id?: string) {
  const raw = String(id || '').trim();
  if (isGroupChat(raw)) return '';
  const digits = raw.replace(/@.*$/, '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const first = digits.length === 13 ? digits.slice(4, 9) : digits.slice(4, 8);
    const last = digits.length === 13 ? digits.slice(9) : digits.slice(8);
    return `+55 ${ddd} ${first}-${last}`;
  }
  return `+${digits}`;
}

function formatParticipantLabel(id?: string, name?: string) {
  const cleanName = String(name || '').trim();
  if (cleanName && !looksLikeRawWhatsappId(cleanName)) return cleanName;
  return formatWhatsappPhone(id) || 'Participante';
}

function looksLikeRawWhatsappId(value?: string) {
  const text = String(value || '').trim();
  if (!text) return true;
  const clean = text.replace(/@.*$/, '');
  return /^\d{10,}$/.test(clean) || /^\+?\d[\d\s().-]+$/.test(text);
}

function contactDisplayName(contact?: ChatContact | null) {
  if (isGroupContact(contact)) return groupDisplayName(contact);
  const name = String(contact?.name || '').trim();
  if (name && !looksLikeRawWhatsappId(name)) return name;
  return formatWhatsappPhone(contact?.id) || 'Contato WhatsApp';
}

function contactSubtitle(contact: ChatContact) {
  if (contact.lastMessage) return contact.lastMessage;
  if (isGroupContact(contact)) return 'Grupo do WhatsApp';
  return formatWhatsappPhone(contact.id);
}

function sameMessages(previous: ChatMessage[], next: ChatMessage[]) {
  if (previous.length !== next.length) return false;
  return previous.every((message, index) => {
    const nextMessage = next[index];
    return (
      message.id === nextMessage?.id &&
      message.text === nextMessage.text &&
      message.time === nextMessage.time &&
      message.sender === nextMessage.sender &&
      message.participantId === nextMessage.participantId &&
      message.participantName === nextMessage.participantName &&
      message.media?.url === nextMessage.media?.url
    );
  });
}

export default function ChatPage() {
  const router = useRouter();
  const [activeContact, setActiveContact] = useState<ChatContact | null>(null);
  const [messageText, setMessageText] = useState('');
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [whatsappStatus, setWhatsappStatus] = useState('DISCONNECTED');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testPanelOpen, setTestPanelOpen] = useState(false);
  const [testPhone, setTestPhone] = useState(DEFAULT_PHONE_PREFIX);
  const [testMessage, setTestMessage] = useState('Ola! Sua integracao WhatsApp da Innovation IA esta funcionando.');
  const [sendingTest, setSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState('');
  const [testError, setTestError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sendError, setSendError] = useState('');
  const [visibleMessageCount, setVisibleMessageCount] = useState(INITIAL_VISIBLE_MESSAGES);
  const messagesScrollRef = useRef<null | HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const restoreScrollRef = useRef<null | { previousHeight: number; previousTop: number }>(null);
  const pendingInitialScrollRef = useRef(false);
  const pendingOutboundScrollRef = useRef(false);

  const newestMessageId = messages[messages.length - 1]?.id;

  useEffect(() => {
    const element = messagesScrollRef.current;
    if (loadingMessages) return;
    if (!element || (!pendingInitialScrollRef.current && !pendingOutboundScrollRef.current)) return;
    element.scrollTop = element.scrollHeight;
    pendingInitialScrollRef.current = false;
    pendingOutboundScrollRef.current = false;
  }, [newestMessageId, loadingMessages]);

  useLayoutEffect(() => {
    const restore = restoreScrollRef.current;
    const element = messagesScrollRef.current;
    if (!restore || !element) return;
    restoreScrollRef.current = null;
    element.scrollTop = element.scrollHeight - restore.previousHeight + restore.previousTop;
  }, [visibleMessageCount]);

  const isWhatsappConnected = whatsappStatus === 'CONNECTED';

  const fetchWhatsappStatus = async () => {
    const res = await fetch(`${getApiBaseUrl()}/communication/whatsapp/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Status request failed: ${res.status}`);
    const payload = unwrap<WhatsappStatusPayload>(await res.json());
    setWhatsappStatus(String(payload.status || 'DISCONNECTED').toUpperCase());
  };

  const fetchContacts = async () => {
    const res = await fetch(`${getApiBaseUrl()}/communication/chats`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Chats request failed: ${res.status}`);
    const payload = await res.json();
    const nextContacts = (payload.data ?? payload) as ChatContact[];
    setContacts(nextContacts);
    setActiveContact((current) =>
      current ? nextContacts.find((contact) => contact.id === current.id) || current : nextContacts[0] || null,
    );
  };

  const fetchMessages = async (jid: string, options: { silent?: boolean } = {}) => {
    const scrollEl = messagesScrollRef.current;
    shouldStickToBottomRef.current = !scrollEl || scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 96;
    if (!options.silent) setLoadingMessages(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/communication/chats/${encodeURIComponent(jid)}/messages`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Messages request failed: ${res.status}`);
      const payload = await res.json();
      const nextMessages = (payload.data ?? payload) as ChatMessage[];
      setMessages((previous) => (sameMessages(previous, nextMessages) ? previous : nextMessages));
    } finally {
      if (!options.silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void fetchWhatsappStatus().catch((error) => console.error('Error fetching WhatsApp status:', error));
    const statusInterval = setInterval(() => {
      void fetchWhatsappStatus().catch((error) => console.error('Error fetching WhatsApp status:', error));
    }, 5000);
    void fetchContacts()
      .catch((error) => {
        console.error('Error fetching contacts:', error);
        setContacts([]);
      })
      .finally(() => setLoadingContacts(false));
    const interval = setInterval(() => {
      void fetchContacts().catch((error) => console.error('Error fetching contacts:', error));
    }, 10000);
    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, []);

  useEffect(() => {
    if (!activeContact) {
      setMessages([]);
      return;
    }

    setVisibleMessageCount(INITIAL_VISIBLE_MESSAGES);
    shouldStickToBottomRef.current = true;
    pendingInitialScrollRef.current = true;
    void fetchMessages(activeContact.id).catch((error) => {
      console.error('Error fetching messages:', error);
      setMessages([]);
    });
    const interval = setInterval(() => {
      void fetchMessages(activeContact.id, { silent: true }).catch((error) => console.error('Error fetching messages:', error));
    }, 3000);
    return () => clearInterval(interval);
  }, [activeContact?.id]);

  const filteredContacts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return contacts;
    return contacts.filter((contact) => {
      const idLabel = contact.id.split('@')[0].toLowerCase();
      return (
        contactDisplayName(contact).toLowerCase().includes(normalizedSearch) ||
        formatWhatsappPhone(contact.id).toLowerCase().includes(normalizedSearch) ||
        idLabel.includes(normalizedSearch)
      );
    });
  }, [contacts, searchTerm]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeContact || sendingMessage) return;

    const textToSend = messageText.trim();
    setMessageText('');
    setSendError('');
    setSendingMessage(true);

    try {
      const res = await fetch(`${getApiBaseUrl()}/communication/messages/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ phone: activeContact.id, body: textToSend, contactName: contactDisplayName(activeContact) }),
      });
      if (!res.ok) throw new Error(`Send request failed: ${res.status}`);
      const payload = unwrap<SendMessagePayload>(await res.json());
      if (!payload.externalId) {
        setSendError('O WhatsApp nao confirmou o envio. Confira o numero e tente novamente.');
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: payload.externalId,
          sender: 'bot',
          text: textToSend,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: true,
        },
      ]);
      pendingOutboundScrollRef.current = true;
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError('Falha ao enviar. Verifique se o WhatsApp esta conectado e se o numero tem DDI/DDD.');
      setMessageText(textToSend);
    } finally {
      setSendingMessage(false);
    }
  };

  const visibleMessages = useMemo(() => messages.slice(-visibleMessageCount), [messages, visibleMessageCount]);
  const hiddenOlderMessages = Math.max(messages.length - visibleMessages.length, 0);

  const loadOlderMessages = () => {
    const element = messagesScrollRef.current;
    if (element) {
      restoreScrollRef.current = {
        previousHeight: element.scrollHeight,
        previousTop: element.scrollTop,
      };
    }
    shouldStickToBottomRef.current = false;
    setVisibleMessageCount((count) => Math.min(messages.length, count + LOAD_OLDER_STEP));
  };

  const handleMessagesScroll = () => {
    const element = messagesScrollRef.current;
    if (!element) return;
    shouldStickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 96;
    if (element.scrollTop < 80 && hiddenOlderMessages > 0) {
      loadOlderMessages();
    }
  };

  const sendTest = async () => {
    if (!hasSendablePhone(testPhone) || !testMessage.trim() || sendingTest) return;

    setSendingTest(true);
    setTestFeedback('');
    setTestError('');

    try {
      const res = await fetch(`${getApiBaseUrl()}/communication/messages/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          phone: testPhone,
          body: testMessage,
          contactName: 'Teste WhatsApp',
        }),
      });
      if (!res.ok) throw new Error(`Send test failed: ${res.status}`);
      const payload = unwrap<SendMessagePayload>(await res.json());
      if (!payload.externalId) {
        setTestError('O WhatsApp nao confirmou o envio. Confira o numero e tente novamente.');
        return;
      }
      setTestFeedback(`Teste enviado. ID: ${payload.externalId}`);
    } catch (error) {
      console.error('Error sending test message:', error);
      setTestError('Falha ao enviar teste. Verifique conexao e DDI/DDD.');
    } finally {
      setSendingTest(false);
    }
  };

  const disconnectWhatsapp = async () => {
    setDisconnecting(true);
    setSendError('');

    try {
      const res = await fetch(`${getApiBaseUrl()}/communication/whatsapp/disconnect`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Disconnect failed: ${res.status}`);
      setContacts([]);
      setMessages([]);
      setActiveContact(null);
      router.replace('/dashboard/whatsapp/accounts');
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      setSendError('Nao foi possivel desconectar o WhatsApp agora.');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-220px)] overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.10)] md:h-[calc(100vh-142px)] md:min-h-[620px] md:rounded-[22px]">
      <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr_280px]">
        <section className="flex max-h-[42vh] min-h-0 min-w-0 flex-col border-b border-slate-200 bg-slate-50 md:max-h-none md:border-b-0 md:border-r">
          <div className="border-b border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700">WhatsApp</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Mensagens</h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                {contacts.length}
              </span>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar contato..."
                className="h-10 w-full rounded-[12px] border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-950"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loadingContacts ? (
              <EmptyList icon={<Loader2 className="h-5 w-5 animate-spin" />} text="Carregando contatos..." />
            ) : !isWhatsappConnected ? (
              <EmptyList icon={<WifiOff className="h-5 w-5" />} text="WhatsApp desconectado. Conecte um numero para carregar conversas." />
            ) : filteredContacts.length === 0 ? (
              <EmptyList icon={<MessageCircle className="h-5 w-5" />} text="Nenhuma conversa encontrada ainda." />
            ) : (
              <div className="space-y-2">
                {filteredContacts.map((contact) => {
                  const active = activeContact?.id === contact.id;
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => setActiveContact(contact)}
                      className={`w-full rounded-[16px] border p-3 text-left transition ${
                        active
                          ? 'border-slate-950 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.10)]'
                          : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${isGroupContact(contact) ? 'bg-teal-700' : 'bg-slate-950'}`}>
                          <ChatAvatar contact={contact} size="sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-black text-slate-950">{contactDisplayName(contact)}</p>
                            <span className="shrink-0 text-[10px] font-semibold text-slate-400">{contact.time || ''}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-medium text-slate-500">
                              {contactSubtitle(contact)}
                            </p>
                            {(contact.unreadCount || 0) > 0 ? (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 px-1.5 text-[10px] font-black text-white">
                                {contact.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 min-w-0 flex-col bg-white">
          {activeContact ? (
            <>
              <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:h-20 md:px-6 md:py-0">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${isGroupContact(activeContact) ? 'bg-teal-700' : 'bg-slate-950'}`}>
                    <ChatAvatar contact={activeContact} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black text-slate-950">{contactDisplayName(activeContact)}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                      <Bot size={12} /> {isGroupContact(activeContact) ? 'Grupo monitorado pela Omnius IA' : 'Omnius IA monitorando'}
                    </p>
                  </div>
                </div>
                <div className="hidden items-center gap-1 text-slate-500 sm:flex">
                  <IconButton label="Video" icon={<Video size={18} />} />
                  <IconButton label="Telefone" icon={<Phone size={18} />} />
                  <IconButton label="Mais" icon={<MoreVertical size={18} />} />
                </div>
              </div>

              {sendError ? (
                <div className="mx-6 mt-4 flex items-center gap-2 rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800">
                  <AlertCircle size={15} />
                  {sendError}
                </div>
              ) : null}

              <div
                ref={messagesScrollRef}
                onScroll={handleMessagesScroll}
                className="min-h-[52vh] flex-1 overflow-y-auto overscroll-contain bg-[#efeae2] p-3 sm:p-4 md:min-h-0 md:p-6"
              >
                {loadingMessages ? (
                  <MessageState icon={<Loader2 className="h-6 w-6 animate-spin" />} text="Carregando mensagens..." />
                ) : messages.length === 0 ? (
                  <MessageState icon={<MessageCircle className="h-7 w-7" />} text="Nenhuma mensagem encontrada para esta conversa." />
                ) : (
                  <div className="mx-auto max-w-4xl space-y-2">
                    {hiddenOlderMessages > 0 ? (
                      <div className="sticky top-0 z-10 flex justify-center pb-2">
                        <button
                          type="button"
                          onClick={loadOlderMessages}
                          className="rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-black text-slate-600 shadow-sm"
                        >
                          Ver mensagens anteriores
                        </button>
                      </div>
                    ) : null}
                    {visibleMessages.map((msg) => {
                      const outbound = msg.sender === 'bot';
                      return (
                        <div key={msg.id} className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[92%] rounded-[10px] px-3 py-2 shadow-sm sm:max-w-[82%] lg:max-w-[78%] ${
                              outbound
                                ? 'rounded-tr-[3px] bg-[#d9fdd3] text-slate-900'
                                : 'rounded-tl-[3px] bg-white text-slate-900'
                            }`}
                          >
                            {isGroupContact(activeContact) && !outbound ? (
                              <div className="mb-1 text-[11px] font-black text-teal-700">
                                {formatParticipantLabel(msg.participantId, msg.participantName)}
                              </div>
                            ) : null}
                            {outbound ? (
                              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black text-teal-800">
                                <Bot size={12} /> Innovation IA
                              </div>
                            ) : null}
                            <MessageMedia media={msg.media} />
                            {msg.text ? <p className="whitespace-pre-wrap break-words text-[13px] leading-5">{msg.text}</p> : null}
                            <div className="mt-1 flex items-center justify-end gap-1 text-[10px] font-semibold text-slate-500">
                              {msg.time}
                              {outbound ? <CheckCheck size={12} /> : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white p-2 sm:p-4">
                <div className="flex items-end gap-2 rounded-[16px] border border-slate-300 bg-slate-50 p-2 transition focus-within:border-slate-950">
                  <IconButton label="Emoji" icon={<Smile size={18} />} />
                  <IconButton label="Anexo" icon={<Paperclip size={18} />} />
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    placeholder="Digite uma mensagem..."
                    className="max-h-32 min-h-[42px] flex-1 resize-none bg-transparent py-2.5 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                    rows={1}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendMessage()}
                    disabled={!messageText.trim() || sendingMessage || !isWhatsappConnected}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-slate-950 text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                    title="Enviar"
                    aria-label="Enviar"
                  >
                    {sendingMessage ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <MessageState icon={<MessageCircle className="h-9 w-9" />} text="Selecione uma conversa para comecar" />
          )}
        </section>

        <aside className="hidden min-w-0 flex-col border-l border-slate-200 bg-slate-50 p-5 xl:flex">
          <h3 className="mb-4 text-lg font-black text-slate-950">Operacao CRM</h3>
          <div className={`mb-3 flex items-center gap-2 rounded-[14px] border px-3 py-2 text-xs font-black ${isWhatsappConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            {isWhatsappConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isWhatsappConnected ? 'WhatsApp conectado' : 'WhatsApp desconectado'}
          </div>
          {isWhatsappConnected ? (
            <button
              type="button"
              onClick={() => void disconnectWhatsapp()}
              disabled={disconnecting}
              className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-rose-200 bg-rose-50 text-xs font-black text-rose-800 shadow-sm transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {disconnecting ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
              {disconnecting ? 'Desconectando...' : 'Trocar numero'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/dashboard/whatsapp/accounts')}
              className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-slate-950 text-xs font-black text-white shadow-sm"
            >
              <Wifi size={14} />
              Conectar WhatsApp
            </button>
          )}
          <button
            type="button"
            onClick={() => setTestPanelOpen((open) => !open)}
            className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-slate-300 bg-white text-xs font-black text-slate-700 shadow-sm transition hover:border-slate-950"
          >
            <Send size={14} />
            {testPanelOpen ? 'Fechar teste' : 'Teste de envio'}
          </button>
          {testPanelOpen ? (
            <div className="mb-3 rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Mensagem de teste</p>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Telefone</span>
                <input
                  value={testPhone}
                  onChange={(event) => setTestPhone(event.target.value)}
                  onFocus={() => {
                    if (!testPhone.trim()) setTestPhone(DEFAULT_PHONE_PREFIX);
                  }}
                  placeholder="+55 11 99999-9999"
                  className="mt-1 h-10 w-full rounded-[12px] border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-slate-950"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Mensagem</span>
                <textarea
                  value={testMessage}
                  onChange={(event) => setTestMessage(event.target.value)}
                  rows={4}
                  className="mt-1 w-full resize-none rounded-[12px] border border-slate-300 bg-white p-3 text-xs font-semibold leading-5 text-slate-900 outline-none focus:border-slate-950"
                />
              </label>
              {testFeedback ? <p className="mt-3 rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{testFeedback}</p> : null}
              {testError ? <p className="mt-3 rounded-[12px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">{testError}</p> : null}
              <button
                type="button"
                onClick={() => void sendTest()}
                disabled={sendingTest || !hasSendablePhone(testPhone) || !testMessage.trim()}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-slate-950 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Enviar teste
              </button>
            </div>
          ) : null}
          <div className="space-y-3">
            <PanelLink href="/dashboard/whatsapp/contacts" icon={<Contact size={16} />} title="Contatos" desc="Ver fila de contatos e atendimentos" />
            <PanelLink href="/dashboard/whatsapp/builder" icon={<Workflow size={16} />} title="Automacoes" desc="Ajustar IA, agenda e roteamento" />
            <PanelLink href="/dashboard/rh/pipeline" icon={<Bot size={16} />} title="Pipeline RH" desc="Levar candidatos para triagem" />
          </div>

          <div className="mt-5 rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Resumo da conversa</p>
            <div className="space-y-3 text-sm">
              <SummaryRow label="Contato ativo" value={activeContact ? contactDisplayName(activeContact) : 'Nenhum'} />
              <SummaryRow label="Mensagens carregadas" value={String(messages.length)} />
              <SummaryRow label="Nao lidas" value={String(activeContact?.unreadCount || 0)} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EmptyList({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed border-slate-300 bg-white text-center text-sm font-semibold text-slate-500">
      {icon}
      {text}
    </div>
  );
}

function MessageState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm font-black uppercase tracking-[0.12em] text-slate-400">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white text-teal-600 shadow-sm">
        {icon}
      </div>
      {text}
    </div>
  );
}

function ChatAvatar({ contact, size = 'md' }: { contact: ChatContact; size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 18 : 19;
  if (contact.avatarUrl) {
    return <img src={contact.avatarUrl} alt={contactDisplayName(contact)} className="h-full w-full rounded-full object-cover" />;
  }
  if (isGroupContact(contact)) return <Group size={iconSize} />;
  return <span>{contactInitial(contact)}</span>;
}

function MessageMedia({ media }: { media?: ChatMessage['media'] }) {
  if (!media) return null;

  if (!media.url) {
    return (
      <div className="mb-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
        {media.fileName || mediaLabel(media)}
      </div>
    );
  }

  if (media.type === 'image' || media.type === 'sticker') {
    return (
      <img
        src={media.url}
        alt={media.fileName || 'Midia do WhatsApp'}
        className="mb-2 max-h-72 max-w-full rounded-[8px] object-contain"
      />
    );
  }

  if (media.type === 'video') {
    return <video src={media.url} controls className="mb-2 max-h-72 max-w-full rounded-[8px]" />;
  }

  if (media.type === 'audio') {
    return <audio src={media.url} controls className="mb-2 w-64 max-w-full" />;
  }

  return (
    <a
      href={media.url}
      download={media.fileName || 'anexo-whatsapp'}
      className="mb-2 flex items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700"
    >
      <Paperclip size={14} />
      <span className="truncate">{media.fileName || 'Abrir anexo'}</span>
    </a>
  );
}

function mediaLabel(media: NonNullable<ChatMessage['media']>) {
  if (media.type === 'image') return 'Foto';
  if (media.type === 'video') return 'Video';
  if (media.type === 'audio') return 'Audio';
  if (media.type === 'sticker') return 'Figurinha';
  return 'Anexo';
}

function IconButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
    >
      {icon}
    </button>
  );
}

function PanelLink({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-950"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3 text-teal-700">
          {icon}
          <span className="text-sm font-black text-slate-950">{title}</span>
        </div>
        <ArrowUpRight size={15} className="text-slate-400" />
      </div>
      <p className="text-xs font-medium leading-5 text-slate-500">{desc}</p>
    </Link>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="truncate text-xs font-black text-slate-950">{value}</span>
    </div>
  );
}
