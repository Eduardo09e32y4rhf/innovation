'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, HeadphonesIcon, CheckCircle2, AlertCircle, Loader2, LifeBuoy, Send, ShieldCheck, Building2 } from 'lucide-react';
import api from '@/app/lib/api';
import { BackLink } from '../_components/back-link';

const display = { className: 'font-display' };

export default function SuportePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('ACCESS');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState('');
  const [successTicket, setSuccessTicket] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !description.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios para abrir o chamado.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.publicSupport.createTicket({
        name: name.trim(),
        email: email.trim(),
        category,
        subject: subject.trim(),
        description: description.trim(),
        pageUrl: typeof window !== 'undefined' ? window.location.origin : '',
        website,
      });

      if (res?.success) {
        setSuccessTicket(res.ticketNumber || 'PROT-OK');
      } else {
        setError('Não foi possível registrar o chamado. Verifique os dados ou tente novamente mais tarde.');
      }
    } catch (err: any) {
      console.error('Erro ao abrir chamado:', err);
      setError(err?.message || 'Erro de conexão com o servidor ao abrir o chamado.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setCategory('ACCESS');
    setSubject('');
    setDescription('');
    setSuccessTicket(null);
    setError(null);
  };

  return (
    <main className={`${display.className} min-h-screen bg-[#050b14] text-slate-200 py-6 sm:py-12 px-4 sm:px-6 flex flex-col justify-center items-center`}>
      <div className="w-full min-w-0 max-w-2xl">
        {/* Botão Voltar e Banner Interno */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <BackLink fallbackHref="/login" fallbackLabel="Voltar para o Login" className="inline-flex items-center gap-2 min-h-11 text-sm font-bold text-teal-400 hover:text-teal-300 transition-colors" />
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 min-h-11 text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 px-3.5 py-2 rounded-xl hover:bg-teal-500/20 transition-all"
          >
            <LifeBuoy size={14} className="text-teal-400" />
            Já tem conta? Veja seus chamados no painel
          </Link>
        </div>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 bg-white/[0.02] border border-white/5 p-4 sm:p-6 rounded-3xl">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-500/20">
            <HeadphonesIcon size={28} />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight break-words">Central de Atendimento e Chamados</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Abra uma solicitação de suporte diretamente com a equipe técnica da Innovation RH.
            </p>
          </div>
        </div>

        {/* Cartão de Sucesso */}
        {successTicket ? (
          <div className="bg-gradient-to-b from-teal-950/40 to-[#0a1526] border border-teal-500/30 p-8 rounded-3xl text-center space-y-6 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 mx-auto rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 border border-teal-500/30 shadow-inner">
              <CheckCircle2 size={40} className="animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-teal-500/20 text-teal-300 font-mono text-xs font-bold rounded-full border border-teal-500/30">
                PROTOCOLO: #{successTicket}
              </span>
              <h2 className="text-2xl font-black text-white">Chamado aberto com sucesso!</h2>
              <p className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
                Sua solicitação foi registrada em nosso sistema e encaminhada para o setor de Engenharia e Suporte. Nossa equipe entrará em contato em breve através do e-mail informado.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/15 text-white text-sm font-bold rounded-xl transition-all border border-white/10"
              >
                Abrir outro chamado
              </button>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 text-sm font-black rounded-xl transition-all shadow-lg shadow-teal-500/20 text-center"
              >
                Voltar para o login
              </Link>
            </div>
          </div>
        ) : (
          /* Formulário Interativo de Abertura de Chamado */
          <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/10 p-4 sm:p-8 rounded-3xl space-y-5 sm:space-y-6 shadow-2xl backdrop-blur-xl">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm animate-in fade-in duration-200">
                <AlertCircle size={20} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Honeypot */}
            <div aria-hidden="true" className="hidden opacity-0 absolute -z-50 select-none pointer-events-none">
              <label htmlFor="website">Website</label>
              <input type="text" id="website" name="website" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
            </div>

            <div className="grid gap-5 sm:gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="sup-nome" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Seu Nome Completo <span className="text-rose-400">*</span>
                </label>
                <input id="sup-nome" aria-label="Seu nome"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full min-h-11 bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>

              <div>
                <label htmlFor="sup-email" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  E-mail de Contato / Corporativo <span className="text-rose-400">*</span>
                </label>
                <input id="sup-email" aria-label="Seu e-mail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: joao@empresa.com.br"
                  className="w-full min-h-11 bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="sup-categoria" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Categoria da Solicitação <span className="text-rose-400">*</span>
                </label>
                <select id="sup-categoria" aria-label="Categoria do chamado"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full min-h-11 bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                >
                  <option value="ACCESS" className="bg-[#0a1526]">Problema no login ou senha</option>
                  <option value="BUG" className="bg-[#0a1526]">Erro técnico ou instabilidade</option>
                  <option value="BILLING" className="bg-[#0a1526]">Faturamento, assinatura ou plano</option>
                  <option value="OTHER" className="bg-[#0a1526]">Outras dúvidas ou solicitações</option>
                </select>
              </div>

              <div>
                <label htmlFor="sup-assunto" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Assunto Principal <span className="text-rose-400">*</span>
                </label>
                <input id="sup-assunto" aria-label="Assunto"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Não consigo acessar o painel de ponto"
                  className="w-full min-h-11 bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="sup-descricao" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Descrição Detalhada do Problema <span className="text-rose-400">*</span>
              </label>
              <textarea id="sup-descricao" aria-label="Descrição do problema"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que está acontecendo, quais passos executou e o que esperava que acontecesse..."
                className="w-full bg-black/40 border border-white/15 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all resize-y"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={16} className="text-teal-400 shrink-0" />
                <span>Atendimento monitorado por SLA e agendador automático.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto min-h-12 px-8 py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Registrando chamado...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Abrir chamado</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
