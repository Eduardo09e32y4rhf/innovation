'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Bot,
  Briefcase,
  MessageSquare,
  PhoneCall,
  Settings2,
  Smartphone,
  Users,
  Workflow,
} from 'lucide-react';

const legacyCoreFeatures = [
  {
    title: 'Conexoes',
    description: 'Pareamento da instancia, QR Code e status operacional do WhatsApp.',
    icon: <Smartphone className="text-green-400" size={22} />,
    href: '/dashboard/whatsapp/accounts',
  },
  {
    title: 'Conversas',
    description: 'Acompanhe chats, mensagens recebidas e envio manual pelo CRM.',
    icon: <MessageSquare className="text-cyan-300" size={22} />,
    href: '/dashboard/whatsapp/chat',
  },
  {
    title: 'Automacoes',
    description: 'Prompt, Gemini, GPT, Google Agenda e builder operacional do Omnius.',
    icon: <Workflow className="text-purple-400" size={22} />,
    href: '/dashboard/whatsapp/builder',
  },
  {
    title: 'Pipeline RH',
    description: 'Triagem, score, sentimento e movimentacao do candidato no Kanban.',
    icon: <Briefcase className="text-orange-400" size={22} />,
    href: '/dashboard/rh/pipeline',
  },
];

export default function ChatOperationsPage() {
  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-700">
      <header className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            CRM Operacional
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">Central de atendimento e automacao</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-400">
            Aqui eu trouxe a parte mais importante do legado: conexao, atendimento, automacao e pipeline.
            Sem o shell antigo, mas com os fluxos que realmente fazem falta na operacao.
          </p>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {legacyCoreFeatures.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="rounded-3xl border border-white/10 bg-[#09111d] p-6 transition hover:border-cyan-400/40 hover:bg-[#0c1728]"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="rounded-2xl bg-white/5 p-3">{feature.icon}</div>
              <ArrowUpRight size={18} className="text-gray-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">{feature.description}</p>
          </Link>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-[#09111d] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-purple-500/15 p-3 text-purple-300">
              <Bot size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">O que veio do legado e continua valendo</h2>
              <p className="text-sm text-gray-400">
                Mantive a alma operacional do `WrapperApp`, mas agora encaixada na arquitetura nova.
              </p>
            </div>
          </div>

          <ul className="space-y-3 text-sm text-gray-300">
            <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              Atendimento em tempo real com foco em conversa, nao em shell paralelo.
            </li>
            <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              Configuracao de conexao e QR centralizada na borda oficial do WhatsApp.
            </li>
            <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              Automacao ligada ao Omnius com Gemini, GPT e Google Agenda por empresa.
            </li>
            <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              Pipeline de RH alimentado por candidatura, score e sentimento desde o primeiro contato.
            </li>
          </ul>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#09111d] p-6">
            <div className="mb-4 flex items-center gap-3">
              <PhoneCall size={20} className="text-emerald-300" />
              <h2 className="text-lg font-semibold">Fluxo principal</h2>
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              <Step label="1" text="Conectar a instancia do cliente" />
              <Step label="2" text="Abrir conversas e iniciar atendimento" />
              <Step label="3" text="Ativar automacoes e IA por chave do cliente" />
              <Step label="4" text="Levar candidatos qualificados para o RH" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#09111d] p-6">
            <div className="mb-4 flex items-center gap-3">
              <Settings2 size={20} className="text-cyan-300" />
              <h2 className="text-lg font-semibold">Atalhos importantes</h2>
            </div>
            <div className="space-y-3">
              <Shortcut href="/dashboard/whatsapp/accounts" icon={<Smartphone size={16} />} label="Instancia oficial" />
              <Shortcut href="/dashboard/whatsapp/chat" icon={<MessageSquare size={16} />} label="Conversas WhatsApp" />
              <Shortcut href="/dashboard/whatsapp/builder" icon={<Workflow size={16} />} label="Builder Omnius" />
              <Shortcut href="/dashboard/rh/pipeline" icon={<Users size={16} />} label="Pipeline de candidatos" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-semibold text-cyan-300">
        {label}
      </div>
      <p className="pt-1">{text}</p>
    </div>
  );
}

function Shortcut({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-gray-200 transition hover:bg-white/5"
    >
      <span className="flex items-center gap-3">
        <span className="text-cyan-300">{icon}</span>
        {label}
      </span>
      <ArrowUpRight size={15} className="text-gray-500" />
    </Link>
  );
}
