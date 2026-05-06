'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, FileText, Mail, MessageSquare, Phone, Star, User, XCircle } from 'lucide-react';
import { getApiBaseUrl, getAuthHeaders } from '../../whatsapp/api';

type Candidate = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  resumeUrl?: string | null;
  coverLetter?: string | null;
  aiScore?: number | null;
  aiSummary?: string | null;
  aiNotes?: string | null;
  aiSkills?: string[];
  lastSentiment?: string | null;
  applications?: Array<{
    id: string;
    status: string;
    createdAt?: string;
    job: { id: string; title: string };
  }>;
};

function CandidateProfileContent() {
  const searchParams = useSearchParams();
  const candidateId = searchParams.get('id');
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    if (!candidateId) return;
    const loadCandidate = async () => {
      const response = await fetch(`${getApiBaseUrl()}/recruitment/candidates/${candidateId}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      setCandidate(data.data ?? data);
    };
    void loadCandidate();
  }, [candidateId]);

  if (!candidate) {
    return <div className="text-sm text-gray-400">Carregando candidato...</div>;
  }

  const mainApplication = candidate.applications?.[0];
  const notes = candidate.aiNotes?.split('\n').filter(Boolean) ?? [];

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-700">
      <header className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-6">
          <div className="grad-bg flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-xl shadow-purple-500/20">
            <User size={40} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{candidate.name}</h1>
            <p className="text-gray-400">
              {mainApplication?.job.title || 'Candidato em analise'} · {candidate.lastSentiment || 'NEUTRAL'}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8">
          <div className="glass rounded-3xl border-purple-500/30 p-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold">Innovation IA Score</h3>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 font-bold text-purple-400">
                {candidate.aiScore ?? 0}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-gray-400">{candidate.aiSummary || 'Analise pendente.'}</p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full bg-purple-500" style={{ width: `${candidate.aiScore ?? 0}%` }}></div>
            </div>
          </div>

          <div className="glass space-y-6 rounded-3xl p-8">
            <h3 className="text-lg font-bold">Contato</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-400">
                <Mail size={18} /> {candidate.email || 'Sem e-mail'}
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Phone size={18} /> {candidate.phone || 'Sem telefone'}
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <MessageSquare size={18} /> {candidate.linkedinUrl || 'Sem LinkedIn'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 lg:col-span-2">
          <div className="glass rounded-3xl p-8">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold">
                <FileText /> Analise de curriculo
              </h3>
              <span className="text-xs font-bold text-purple-400">{candidate.resumeUrl || 'Sem arquivo informado'}</span>
            </div>
            <div className="space-y-6">
              <div>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-500">Resumo da IA</h4>
                <p className="leading-relaxed text-gray-300">{candidate.aiSummary}</p>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-500">Habilidades detectadas</h4>
                <div className="flex flex-wrap gap-2">
                  {(candidate.aiSkills ?? []).map((skill) => (
                    <span key={skill} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              {candidate.coverLetter ? (
                <div>
                  <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-500">Apresentacao</h4>
                  <p className="leading-relaxed text-gray-300">{candidate.coverLetter}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="glass rounded-3xl p-8">
            <h3 className="mb-8 flex items-center gap-2 text-xl font-bold">
              <Star /> Historico e observacoes
            </h3>
            <div className="space-y-6">
              <TimelineItem
                date="Agora"
                event="Status atual"
                desc={mainApplication ? `${mainApplication.status} para ${mainApplication.job.title}` : 'Sem candidatura vinculada.'}
              />
              {notes.map((note, index) => (
                <TimelineItem key={`${note}-${index}`} date="Nota" event="Observacao do pipeline" desc={note} />
              ))}
              {(candidate.applications ?? []).slice(1).map((application) => (
                <TimelineItem
                  key={application.id}
                  date={application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'Registro'}
                  event={application.job.title}
                  desc={`Status: ${application.status}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ date, event, desc }: { date: string; event: string; desc: string }) {
  return (
    <div className="group relative flex gap-6">
      <div className="flex flex-col items-center">
        <div className="h-3 w-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50"></div>
        <div className="h-full w-0.5 bg-white/5"></div>
      </div>
      <div className="pb-8">
        <p className="mb-1 text-[10px] font-bold text-gray-500">{date}</p>
        <p className="mb-1 text-sm font-bold">{event}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
    </div>
  );
}

export default function CandidateProfilePage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-400">Carregando...</div>}>
      <CandidateProfileContent />
    </Suspense>
  );
}
