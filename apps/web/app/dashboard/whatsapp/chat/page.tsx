'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, MoreVertical, Send, Paperclip, Smile, Phone, Video, Bot, CheckCheck, MessageCircle, Contact, Workflow, ArrowUpRight } from 'lucide-react';
import { getApiBaseUrl, getAuthHeaders } from '../api';

type ChatContact = {
  id: string;
  name: string;
  unreadCount?: number;
  time?: string;
  lastMessage?: string;
};

type ChatMessage = {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  read: boolean;
};

export default function ChatPage() {
  const [activeContact, setActiveContact] = useState<ChatContact | null>(null);
  const [messageText, setMessageText] = useState('');
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    const res = await fetch(`${getApiBaseUrl()}/communication/chats`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Chats request failed: ${res.status}`);
    const payload = await res.json();
    const nextContacts = payload.data ?? payload;
    setContacts(nextContacts);
    setActiveContact((current) => current ? nextContacts.find((contact: ChatContact) => contact.id === current.id) || current : nextContacts[0] || null);
  };

  const fetchMessages = async (jid: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/communication/chats/${encodeURIComponent(jid)}/messages`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Messages request failed: ${res.status}`);
      const payload = await res.json();
      setMessages(payload.data ?? payload);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void fetchContacts()
      .catch((error) => {
        console.error('Error fetching contacts:', error);
        setContacts([]);
      })
      .finally(() => setLoadingContacts(false));
    const interval = setInterval(() => {
      void fetchContacts().catch((error) => console.error('Error fetching contacts:', error));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeContact) {
      setMessages([]);
      return;
    }

    void fetchMessages(activeContact.id).catch((error) => {
      console.error('Error fetching messages:', error);
      setMessages([]);
    });
    const interval = setInterval(() => {
      void fetchMessages(activeContact.id).catch((error) => console.error('Error fetching messages:', error));
    }, 3000);
    return () => clearInterval(interval);
  }, [activeContact?.id]);

  const filteredContacts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return contacts;
    return contacts.filter((contact) => {
      const idLabel = contact.id.split('@')[0].toLowerCase();
      return contact.name.toLowerCase().includes(normalizedSearch) || idLabel.includes(normalizedSearch);
    });
  }, [contacts, searchTerm]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeContact) return;

    const textToSend = messageText.trim();
    setMessageText('');

    const res = await fetch(`${getApiBaseUrl()}/communication/messages/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ phone: activeContact.id, body: textToSend, contactName: activeContact.name }),
    });
    if (!res.ok) throw new Error(`Send request failed: ${res.status}`);

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        sender: 'bot',
        text: textToSend,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true,
      },
    ]);
  };

  return (
    <div className="h-[85vh] flex overflow-hidden glass rounded-[32px] border border-white/5 animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
      <div className="w-80 border-r border-white/5 bg-[#0a0a0f]/50 flex flex-col">
        <div className="p-6 border-b border-white/5 bg-black/20">
          <h2 className="text-xl font-bold mb-4">Mensagens</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar contato..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingContacts ? (
            <div className="p-10 text-center text-gray-500 text-sm italic">Carregando contatos...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-sm italic">Nenhuma conversa encontrada.</div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setActiveContact(contact)}
                className={`p-4 border-b border-white/5 flex gap-4 cursor-pointer transition-all ${
                  activeContact?.id === contact.id ? 'bg-purple-500/10 border-l-4 border-l-purple-500' : 'hover:bg-white/5 border-l-4 border-l-transparent'
                }`}
              >
                <div className="w-12 h-12 rounded-full grad-bg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {contact.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm truncate pr-2">{contact.name}</h3>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">{contact.time || ''}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-xs text-gray-400 truncate">{contact.lastMessage || contact.id.split('@')[0]}</p>
                    {(contact.unreadCount || 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-black/40 relative">
        {activeContact ? (
          <>
            <div className="h-20 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full grad-bg flex items-center justify-center font-bold shadow-lg shadow-purple-500/20">
                  {activeContact.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold">{activeContact.name}</h3>
                  <p className="text-xs text-purple-400 flex items-center gap-1">
                    <Bot size={10} /> Omnius IA monitorando
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-gray-400">
                <button aria-label="Vídeo chamada" title="Vídeo chamada" className="hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"><Video size={20} /></button>
                <button aria-label="Chamada de voz" title="Chamada de voz" className="hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"><Phone size={20} /></button>
                <button aria-label="Mais opções" title="Mais opções" className="hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"><MoreVertical size={20} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm italic">Carregando mensagens...</div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm italic">Nenhuma mensagem encontrada para esta conversa.</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === 'bot' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[70%] p-4 rounded-2xl shadow-lg relative ${msg.sender === 'bot' ? 'bg-purple-600/20 border border-purple-500/30 rounded-tr-sm text-purple-50' : 'bg-white/5 border border-white/10 rounded-tl-sm text-gray-200'}`}>
                      {msg.sender === 'bot' && (
                        <div className="flex items-center gap-2 mb-2 text-purple-300">
                          <Bot size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider">Innovation IA</span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                      <div className={`text-[10px] flex items-center justify-end gap-1 mt-2 ${msg.sender === 'bot' ? 'text-purple-400' : 'text-gray-500'}`}>
                        {msg.time}
                        {msg.sender === 'bot' && <CheckCheck size={12} />}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md">
              <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-purple-500/50 transition-colors">
                <button aria-label="Adicionar emoji" title="Adicionar emoji" className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"><Smile size={20} /></button>
                <button aria-label="Anexar arquivo" title="Anexar arquivo" className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"><Paperclip size={20} /></button>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage().catch((error) => console.error('Error sending message:', error));
                    }
                  }}
                  placeholder="Digite uma mensagem ou intercepte a IA..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white resize-none max-h-32 min-h-[44px] py-3 outline-none"
                  rows={1}
                />
                <button
                  aria-label="Enviar mensagem"
                  title="Enviar mensagem"
                  onClick={() => void handleSendMessage().catch((error) => console.error('Error sending message:', error))}
                  className="p-3 grad-bg text-white rounded-xl shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <MessageCircle size={40} className="text-purple-500/30" />
            </div>
            <p className="text-sm font-medium tracking-wide opacity-50 uppercase">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>

      <aside className="w-80 border-l border-white/5 bg-[#0a0a0f]/50 p-5 hidden xl:flex xl:flex-col">
        <h3 className="mb-4 text-lg font-bold">Operacao CRM</h3>
        <div className="space-y-3">
          <PanelLink href="/dashboard/whatsapp/contacts" icon={<Contact size={16} />} title="Contatos" desc="Ver fila de contatos e atendimentos" />
          <PanelLink href="/dashboard/whatsapp/builder" icon={<Workflow size={16} />} title="Automacoes" desc="Ajustar IA, agenda e roteamento" />
          <PanelLink href="/dashboard/rh/pipeline" icon={<Bot size={16} />} title="Pipeline RH" desc="Levar candidatos para triagem" />
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Resumo da conversa</p>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Contato ativo</span>
              <span className="font-medium text-white">{activeContact?.name || 'Nenhum'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Mensagens carregadas</span>
              <span className="font-medium text-white">{messages.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Nao lidas</span>
              <span className="font-medium text-white">{activeContact?.unreadCount || 0}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
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
      className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:bg-white/5"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3 text-cyan-300">
          {icon}
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <ArrowUpRight size={15} className="text-gray-500" />
      </div>
      <p className="text-xs leading-5 text-gray-400">{desc}</p>
    </Link>
  );
}
