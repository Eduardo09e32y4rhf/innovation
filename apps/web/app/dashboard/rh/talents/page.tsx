'use client';

import React, { useEffect, useState } from 'react';
import { Search, User, Mail, Phone, MessageSquare, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getApiBaseUrl, getAuthHeaders } from '../../whatsapp/api';

type Candidate = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  aiScore?: number | null;
  aiSummary?: string | null;
  aiSkills?: string[];
  applications?: any[];
};

export default function TalentPoolPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadCandidates = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${getApiBaseUrl()}/recruitment/candidates`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          setCandidates(data.data ?? data);
        }
      } catch (error) {
        console.error('Failed to load candidates', error);
      } finally {
        setLoading(false);
      }
    };
    void loadCandidates();
  }, []);

  const filteredCandidates = candidates.filter((candidate) => {
    const query = search.toLowerCase();
    const haystack = [
      candidate.name,
      candidate.email,
      candidate.phone,
      ...(candidate.aiSkills ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return !query || haystack.includes(query);
  });

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-700">
      <section className="overflow-hidden rounded-[24px] border border-slate-950 bg-[#07111f] p-6 text-white shadow-[0_24px_60px_rgba(2,6,23,0.24)]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-teal-200">Banco de Talentos</p>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white">Todos os Candidatos</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Descubra talentos que possuem o perfil ideal para suas vagas, mesmo que ainda nao tenham se candidatado.
          </p>
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-300 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.10)]">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, e-mail, telefone ou skill..."
            className="h-11 w-full rounded-[14px] border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
          />
        </div>
      </section>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm font-semibold text-slate-500">
          Carregando banco de talentos...
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredCandidates.map((candidate) => (
            <div key={candidate.id} className="flex flex-col justify-between rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#07111f] text-white">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950">{candidate.name}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      Score: {candidate.aiScore ?? 'N/A'}
                    </div>
                  </div>
                </div>

                <p className="mt-4 line-clamp-3 text-xs leading-relaxed text-slate-600">
                  {candidate.aiSummary || 'Resumo nao disponivel.'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(candidate.aiSkills ?? []).slice(0, 4).map((skill) => (
                    <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-3">
                  {candidate.phone && (
                    <a href={`https://wa.me/${candidate.phone.replace(/\\D/g, '')}`} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100" title="Chamar no WhatsApp">
                      <MessageSquare size={14} />
                    </a>
                  )}
                  {candidate.email && (
                    <a href={`mailto:${candidate.email}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition hover:bg-blue-100" title="Enviar E-mail">
                      <Mail size={14} />
                    </a>
                  )}
                  <div className="ml-auto">
                    <Link href={`/dashboard/rh/candidate?id=${candidate.id}`} className="flex items-center gap-2 text-xs font-bold text-blue-600 transition hover:text-blue-700">
                      Ver perfil <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
