"use client";

import React from 'react';
import {
  BarChart3,
  Briefcase,
  CircleDollarSign,
  CreditCard,
  Gauge,
  LineChart,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

const metrics = [
  { label: 'Funcionarios', value: '3', icon: Users, width: '72%', tone: 'teal' },
  { label: 'Candidatos', value: '3', icon: Briefcase, width: '64%', tone: 'indigo' },
  { label: 'Lancamentos', value: '3', icon: CreditCard, width: '70%', tone: 'cyan' },
  { label: 'Tarefas abertas', value: '5', icon: BarChart3, width: '76%', tone: 'slate' },
];

const financeRows = [
  { description: 'Mensalidade recorrente - Crescimento do Plano', amount: '12.800', type: 'Renda', status: 'Pago' },
  { description: 'Campanhas e automacoes', amount: '2.380', type: 'Despesas', status: 'pendente' },
  { description: 'Setup de implantacao', amount: '5.600', type: 'Renda', status: 'Aberto' },
];

const candidateRows = [
  { name: 'Marina Costa', email: 'marina@talentos.com', status: 'Triagem', created: '06/05/2026' },
  { name: 'Renan Alves', email: 'renan@talentos.com', status: 'entrevista', created: '05/05/2026' },
  { name: 'Bianca Rocha', email: 'bianca@talentos.com', status: 'aprovado', created: '04/05/2026' },
];

export default function DashboardHome() {
  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="crystal-dark hero-crystal relative overflow-hidden rounded-[22px] px-7 py-8 text-white">
          <div className="absolute right-0 top-0 h-56 w-72 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.32),transparent_56%)]" />
          <div className="absolute right-24 top-[-40px] h-56 w-56 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.28),transparent_56%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="relative">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <Gauge size={18} strokeWidth={1.8} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Centro de comando de inovacao</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Painel</h2>
            <p className="mt-2 max-w-xl text-xs text-slate-300">Visao executiva de RH, financeiro, CRM e operacao.</p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          <section className="ops-card rounded-[18px] border border-teal-200/80 bg-[linear-gradient(135deg,#f0fdfa,#ffffff_58%,#ecfeff)] p-5">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1 text-[10px] font-black text-teal-700 shadow-sm">
              <Sparkles size={12} strokeWidth={1.8} />
              Centro Inteligente
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-950">Operacao pronta para automacao</h3>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">
                  Use as leituras de RH, financeiro e canais para priorizar tarefas, candidatos e receitas do dia.
                </p>
              </div>
              <button className="crystal-button inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-black text-white">
                <Zap size={13} strokeWidth={1.8} />
                Percepcoes Gerar
              </button>
            </div>
          </section>

          <section className="crystal-dark relative overflow-hidden rounded-[18px] p-5 text-white">
            <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-cyan-200">
              <LineChart size={17} strokeWidth={1.8} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Saude operacional</p>
            <p className="mt-3 text-3xl font-black">92%</p>
            <p className="mt-1 text-xs text-slate-400">Baseado em tarefas, caixa e pipeline.</p>
          </section>
        </div>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="ops-card group rounded-[18px] border border-slate-200 bg-white p-5">
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                  <div className={`icon-chip icon-chip-${metric.tone}`}>
                    <Icon size={15} strokeWidth={1.8} />
                  </div>
                </div>
                <p className="text-3xl font-black text-slate-950">{metric.value}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 shadow-[0_0_10px_rgba(45,212,191,0.45)]" style={{ width: metric.width }} />
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <DataTable title="Financeiro recente" headers={['Descricao', 'Quantidade', 'Tipo', 'Status']}>
            {financeRows.map((row) => (
              <tr key={row.description} className="border-t border-slate-100 transition-colors hover:bg-slate-50/80">
                <td className="py-3 pr-4 text-xs text-slate-700">{row.description}</td>
                <td className="py-3 pr-4 text-xs font-medium text-slate-950">{row.amount}</td>
                <td className="py-3 pr-4 text-xs text-slate-700">{row.type}</td>
                <td className="py-3 text-xs text-slate-700">{row.status}</td>
              </tr>
            ))}
          </DataTable>

          <DataTable title="Candidatos recentes" headers={['full_name', 'E-mail', 'Status', 'created_at']}>
            {candidateRows.map((row) => (
              <tr key={row.email} className="border-t border-slate-100 transition-colors hover:bg-slate-50/80">
                <td className="py-3 pr-4 text-xs text-slate-700">{row.name}</td>
                <td className="py-3 pr-4 text-xs text-slate-700">{row.email}</td>
                <td className="py-3 pr-4 text-xs text-slate-700">{row.status}</td>
                <td className="py-3 text-xs text-slate-700">{row.created}</td>
              </tr>
            ))}
          </DataTable>
        </section>
      </div>
    </ProtectedRoute>
  );
}

function DataTable({
  title,
  headers,
  children,
}: {
  title: string;
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="ops-card overflow-hidden rounded-[18px] border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white shadow-[0_12px_22px_rgba(2,6,23,0.22)]">
          {title.includes('Financeiro') ? <CircleDollarSign size={14} strokeWidth={1.8} /> : <Target size={14} strokeWidth={1.8} />}
        </div>
      </div>
      <div className="px-5 py-4">
        <table className="w-full text-left">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} className="pb-3 pr-4 text-[11px] font-medium text-slate-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
