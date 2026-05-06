'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Contact, MessageSquare, Search, Tags, UserRound } from 'lucide-react';
import { getApiBaseUrl, getAuthHeaders } from '../api';

type Conversation = {
  id: string;
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

const statusStyles: Record<string, string> = {
  OPEN: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  CLOSED: 'bg-white/10 text-gray-300 border-white/15',
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
        conversation.contact?.name,
        conversation.contact?.phone,
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
    <div className="mx-auto max-w-6xl animate-in fade-in duration-700">
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            CRM de Contatos
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">Contatos e atendimentos</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-400">
            Essa tela traz uma das partes mais valiosas do legado: enxergar rapidamente quem esta no funil de conversa,
            com ultimo contato e status operacional.
          </p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar contato, telefone ou mensagem..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-white/10 bg-[#09111d] p-4">
          <div className="mb-3 flex items-center justify-between px-2">
            <h2 className="text-lg font-semibold">Fila de relacionamento</h2>
            <span className="text-sm text-gray-500">{filteredConversations.length} contatos</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="px-4 py-10 text-sm text-gray-500">Carregando contatos...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="px-4 py-10 text-sm text-gray-500">Nenhum contato encontrado.</div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-300">
                        <UserRound size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {conversation.contact?.name || conversation.contact?.phone || 'Contato sem nome'}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {conversation.contact?.phone || 'Sem telefone'} {conversation.contact?.email ? `· ${conversation.contact.email}` : ''}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                        statusStyles[conversation.status] || statusStyles.CLOSED
                      }`}
                    >
                      {conversation.status}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-gray-300">
                    {conversation.lastMessage || 'Ainda sem ultima mensagem registrada.'}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {conversation.lastMessageAt
                        ? new Date(conversation.lastMessageAt).toLocaleString('pt-BR')
                        : 'Sem horario'}
                    </span>
                    <Link
                      href="/dashboard/whatsapp/chat"
                      className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300"
                    >
                      <MessageSquare size={15} />
                      Abrir conversa
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#09111d] p-6">
            <div className="mb-4 flex items-center gap-3">
              <Contact size={20} className="text-cyan-300" />
              <h2 className="text-lg font-semibold">Por que isso importa</h2>
            </div>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                Visao rapida dos contatos quentes sem abrir o shell antigo.
              </li>
              <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                Ultima mensagem e status da conversa no mesmo lugar.
              </li>
              <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                Ponte direta entre atendimento, WhatsApp e pipeline RH.
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#09111d] p-6">
            <div className="mb-4 flex items-center gap-3">
              <Tags size={20} className="text-purple-300" />
              <h2 className="text-lg font-semibold">Atalhos</h2>
            </div>
            <div className="space-y-3">
              <QuickLink href="/dashboard/chat" label="Central CRM" />
              <QuickLink href="/dashboard/whatsapp/accounts" label="Instancia e QR Code" />
              <QuickLink href="/dashboard/whatsapp/chat" label="Inbox de conversas" />
              <QuickLink href="/dashboard/rh/pipeline" label="Levar contato para RH" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-gray-200 transition hover:bg-white/5"
    >
      {label}
    </Link>
  );
}
