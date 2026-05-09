'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Contact, Group, MessageSquare, Search, Tags, UserRound } from 'lucide-react';
import { getApiBaseUrl, getAuthHeaders } from '../api';

type Conversation = {
  id: string;
  whatsappJid?: string | null;
  isGroup?: boolean;
  status: 'OPEN' | 'PENDING' | 'CLOSED';
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  contact?: {
    id: string;
    name?: string | null;
    phone: string;
    email?: string | null;
    tags?: string[];
  };
};

function isGroupChat(id?: string | null) {
  return String(id || '').endsWith('@g.us');
}

function formatWhatsappPhone(value?: string | null) {
  const raw = String(value || '').trim();
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

function looksLikeRawWhatsappId(value?: string | null) {
  const text = String(value || '').trim();
  if (!text) return true;
  const clean = text.replace(/@.*$/, '');
  return /^\d{10,}$/.test(clean) || /^\+?\d[\d\s().-]+$/.test(text);
}

function conversationJid(conversation: Conversation) {
  return conversation.whatsappJid || conversation.contact?.phone || conversation.id;
}

function conversationIsGroup(conversation: Conversation) {
  return Boolean(conversation.isGroup || isGroupChat(conversationJid(conversation)));
}

function conversationDisplayName(conversation: Conversation) {
  const name = String(conversation.contact?.name || '').trim();
  if (name && !looksLikeRawWhatsappId(name)) return name;
  if (conversationIsGroup(conversation)) return 'Grupo do WhatsApp';
  return formatWhatsappPhone(conversation.contact?.phone || conversationJid(conversation)) || 'Contato sem nome';
}

function conversationSubtitle(conversation: Conversation) {
  if (conversationIsGroup(conversation)) return 'Grupo do WhatsApp';
  const phone = formatWhatsappPhone(conversation.contact?.phone || conversationJid(conversation));
  return `${phone || 'Sem telefone'}${conversation.contact?.email ? ` - ${conversation.contact.email}` : ''}`;
}

const statusStyles: Record<string, string> = {
  OPEN: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  CLOSED: 'border-slate-200 bg-slate-100 text-slate-600',
};

export default function WhatsappContactsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${getApiBaseUrl()}/communication/conversations`, {
          headers: getAuthHeaders(),
        });
        const payload = await response.json();
        setConversations(Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : []);
      } finally {
        setLoading(false);
      }
    };

    void loadConversations();
  }, []);

  const filteredConversations = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return conversations;
    return conversations.filter((conversation) => {
      const haystack = [
        conversationDisplayName(conversation),
        conversationSubtitle(conversation),
        formatWhatsappPhone(conversation.contact?.phone || conversation.whatsappJid),
        conversation.contact?.email,
        conversation.lastMessage,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [conversations, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="overflow-hidden rounded-[22px] border border-slate-950 bg-slate-950 p-6 text-white shadow-[0_18px_42px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-300">CRM WhatsApp</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white">Contatos e atendimentos</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Acompanhe a fila de relacionamento, ultima mensagem e status de cada conversa.
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar contato, telefone ou mensagem..."
              className="h-11 w-full rounded-[14px] border border-white/15 bg-white/10 pl-10 pr-4 text-sm font-semibold text-white outline-none placeholder:text-slate-400 focus:border-teal-300"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Fila de relacionamento</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Conversas sincronizadas do WhatsApp.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
              {filteredConversations.length} contatos
            </span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <EmptyState text="Carregando contatos..." />
            ) : filteredConversations.length === 0 ? (
              <EmptyState text="Nenhum contato encontrado." />
            ) : (
              filteredConversations.map((conversation) => (
                <article
                  key={conversation.id}
                  className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-950"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${conversationIsGroup(conversation) ? 'bg-teal-700' : 'bg-slate-950'}`}>
                        {conversationIsGroup(conversation) ? <Group size={18} /> : <UserRound size={18} />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-slate-950">
                          {conversationDisplayName(conversation)}
                        </h3>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                          {conversationSubtitle(conversation)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-black ${
                        statusStyles[conversation.status] || statusStyles.CLOSED
                      }`}
                    >
                      {conversation.status}
                    </span>
                  </div>

                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
                    {conversation.lastMessage || 'Ainda sem ultima mensagem registrada.'}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <span className="text-xs font-semibold text-slate-500">
                      {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleString('pt-BR') : 'Sem horario'}
                    </span>
                    <Link
                      href="/dashboard/whatsapp/chat"
                      className="inline-flex items-center gap-2 rounded-[12px] bg-slate-950 px-3 py-2 text-xs font-black text-white"
                    >
                      <MessageSquare size={14} />
                      Abrir conversa
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <InfoCard
            icon={<Contact size={19} />}
            title="Operacao de contatos"
            items={[
              'Visao rapida dos contatos quentes.',
              'Ultima mensagem e status no mesmo lugar.',
              'Ponte direta entre atendimento e pipeline RH.',
            ]}
          />
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-slate-950 text-white">
                <Tags size={18} />
              </div>
              <h2 className="text-base font-black text-slate-950">Atalhos</h2>
            </div>
            <div className="space-y-2">
              <QuickLink href="/dashboard/whatsapp/accounts" label="Instancia e QR Code" />
              <QuickLink href="/dashboard/whatsapp/chat" label="Inbox de conversas" />
              <QuickLink href="/dashboard/whatsapp/builder" label="Automacoes" />
              <QuickLink href="/dashboard/rh/pipeline" label="Levar contato para RH" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}

function InfoCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-teal-50 text-teal-700">
          {icon}
        </div>
        <h2 className="text-base font-black text-slate-950">{title}</h2>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-950 hover:bg-white"
    >
      {label}
    </Link>
  );
}
