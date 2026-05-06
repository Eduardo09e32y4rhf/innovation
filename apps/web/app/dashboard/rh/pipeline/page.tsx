'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Filter, MessageSquare, Search, Send, Star, User } from 'lucide-react';
import Link from 'next/link';
import { getApiBaseUrl, getAuthHeaders } from '../../whatsapp/api';

type Job = {
  id: string;
  title: string;
};

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
  applications?: Array<{ id: string; status: string; job: Job }>;
};

type Application = {
  id: string;
  status: string;
  candidate: Candidate;
  job: Job;
  createdAt?: string;
};

const COLUMNS = [
  { id: 'APPLIED', title: 'Novos', color: 'bg-blue-500' },
  { id: 'SCREENING', title: 'Triagem IA', color: 'bg-purple-500' },
  { id: 'INTERVIEW', title: 'Entrevista', color: 'bg-amber-500' },
  { id: 'OFFER', title: 'Oferta', color: 'bg-cyan-500' },
  { id: 'HIRED', title: 'Contratado', color: 'bg-emerald-500' },
  { id: 'REJECTED', title: 'Rejeitado', color: 'bg-rose-500' },
];

export default function PipelinePage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Application | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/recruitment/applications`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      setApplications(Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApplications();
  }, []);

  const filteredApplications = useMemo(() => {
    return applications.filter((application) => {
      const haystack = [
        application.candidate.name,
        application.candidate.email,
        application.job.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [applications, search]);

  const applicationsByStatus = useMemo(() => {
    return COLUMNS.reduce<Record<string, Application[]>>((accumulator, column) => {
      accumulator[column.id] = filteredApplications.filter((application) => application.status === column.id);
      return accumulator;
    }, {});
  }, [filteredApplications]);

  const moveApplication = async (applicationId: string, status: string) => {
    const response = await fetch(`${getApiBaseUrl()}/recruitment/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return;
    const payload = await response.json();
    const updated = payload.data ?? payload;
    setApplications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelected((current) => (current?.id === updated.id ? updated : current));
  };

  const saveNote = async () => {
    if (!selected || !noteInput.trim()) return;
    setSavingNote(true);
    const currentNotes = selected.candidate.aiNotes?.trim();
    const nextNotes = [currentNotes, noteInput.trim()].filter(Boolean).join('\n');

    const response = await fetch(`${getApiBaseUrl()}/recruitment/candidates/${selected.candidate.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ aiNotes: nextNotes }),
    });

    if (response.ok) {
      const payload = await response.json();
      const updatedCandidate = payload.data ?? payload;
      setApplications((current) =>
        current.map((item) =>
          item.candidate.id === updatedCandidate.id
            ? { ...item, candidate: { ...item.candidate, ...updatedCandidate } }
            : item,
        ),
      );
      setSelected((current) =>
        current ? { ...current, candidate: { ...current.candidate, ...updatedCandidate } } : current,
      );
      setNoteInput('');
    }
    setSavingNote(false);
  };

  const recruiterNotes = selected?.candidate.aiNotes?.split('\n').filter(Boolean) ?? [];

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Pipeline de recrutamento</h1>
            <p className="mt-1 text-sm text-gray-400">
              {loading ? 'Carregando candidatos...' : `${filteredApplications.length} candidaturas ativas`}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar candidato ou vaga..."
                className="w-64 rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button className="rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10">
              <Filter size={18} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <div key={column.id} className="flex min-w-[290px] flex-col rounded-3xl border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-4 flex items-center gap-2 px-1">
                <div className={`h-2 w-2 rounded-full ${column.color}`}></div>
                <h3 className="flex-1 text-sm font-bold uppercase tracking-widest text-gray-300">{column.title}</h3>
                <span className="rounded-lg bg-white/5 px-2 py-0.5 font-mono text-xs text-gray-500">
                  {applicationsByStatus[column.id]?.length ?? 0}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto">
                {(applicationsByStatus[column.id] ?? []).map((application) => (
                  <button
                    key={application.id}
                    onClick={() => setSelected(application)}
                    className={`glass w-full rounded-2xl border p-4 text-left transition-all hover:border-purple-500/50 ${
                      selected?.id === application.id ? 'border-purple-500' : 'border-white/5'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-purple-500/30 to-blue-500/30">
                          <User size={16} className="text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold leading-none">{application.candidate.name}</p>
                          <p className="mt-0.5 text-[10px] text-gray-500">{application.job.title}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-lg bg-purple-500/10 px-2 py-0.5">
                        <Star size={10} className="fill-yellow-400 text-yellow-400" />
                        <span className="text-[10px] font-bold text-purple-400">{application.candidate.aiScore ?? 0}</span>
                      </div>
                      <span className="text-[10px] text-gray-500">{application.candidate.lastSentiment || 'NEUTRAL'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected ? (
        <aside className="glass flex w-96 flex-col overflow-hidden rounded-3xl border border-purple-500/20">
          <div className="border-b border-white/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-bold">{selected.candidate.name}</p>
                <p className="mt-1 text-sm text-gray-500">{selected.job.title}</p>
                <p className="mt-2 text-xs text-gray-400">{selected.candidate.email || 'Sem e-mail informado'}</p>
              </div>
              <Link href={`/dashboard/rh/candidate?id=${selected.candidate.id}`} className="text-sm text-cyan-300">
                Abrir perfil
              </Link>
            </div>
          </div>

          <div className="border-b border-white/5 px-5 py-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">IA Score</span>
              <span className="text-lg font-black text-purple-400">{selected.candidate.aiScore ?? 0}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                style={{ width: `${selected.candidate.aiScore ?? 0}%` }}
              ></div>
            </div>
            <p className="mt-3 text-xs leading-6 text-gray-400">{selected.candidate.aiSummary || 'Analise pendente.'}</p>
          </div>

          <div className="border-b border-white/5 px-5 py-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Mover etapa</p>
            <div className="grid grid-cols-2 gap-2">
              {COLUMNS.map((column) => (
                <button
                  key={column.id}
                  onClick={() => void moveApplication(selected.id, column.id)}
                  className={`rounded-xl border px-3 py-2 text-xs transition ${
                    selected.status === column.id
                      ? 'border-purple-500 bg-purple-500/15 text-purple-200'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {column.title}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <MessageSquare size={12} /> Notas e analise
            </p>

            <div className="space-y-3">
              {recruiterNotes.map((note, index) => (
                <div key={`${note}-${index}`} className="rounded-xl border border-white/5 bg-white/5 p-3 text-xs text-gray-300">
                  {note}
                </div>
              ))}
              {selected.candidate.aiSkills?.length ? (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
                  Skills detectadas: {selected.candidate.aiSkills.join(', ')}
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-white/5 p-4">
            <div className="flex gap-2">
              <input
                value={noteInput}
                onChange={(event) => setNoteInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void saveNote()}
                placeholder="Adicionar observacao do recrutador..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                onClick={() => void saveNote()}
                disabled={savingNote}
                className="grad-bg rounded-xl p-2 transition-transform hover:scale-105 disabled:opacity-60"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
