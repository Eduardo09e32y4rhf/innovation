'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  DollarSign,
  Loader2,
  MapPin,
  Send,
  Upload,
  Users,
} from 'lucide-react';
import Link from 'next/link';

type Job = {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  employmentType?: string | null;
  salaryRange?: string | null;
  benefits?: string[];
  _count?: {
    applications: number;
  };
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const publicCompanyId = process.env.NEXT_PUBLIC_DEFAULT_COMPANY_ID || '00000000-0000-0000-0000-000000000001';

function JobDetailContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('id');

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    coverLetter: '',
  });

  useEffect(() => {
    if (!jobId) {
      setError('Vaga nao encontrada.');
      setLoading(false);
      return;
    }

    const loadJob = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${apiBaseUrl}/recruitment/public/jobs/${jobId}?companyId=${encodeURIComponent(publicCompanyId)}`,
        );
        if (!response.ok) {
          throw new Error('Nao foi possivel carregar os detalhes da vaga.');
        }
        const data = await response.json();
        setJob(data.data ?? data);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Falha inesperada ao carregar a vaga.',
        );
      } finally {
        setLoading(false);
      }
    };

    void loadJob();
  }, [jobId]);

  const requirements = useMemo(() => {
    return (job?.description || '')
      .split('.')
      .map((part) => part.trim())
      .filter((part) => part.length > 20)
      .slice(0, 4);
  }, [job?.description]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!jobId) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `${apiBaseUrl}/recruitment/public/jobs/${jobId}/apply?companyId=${encodeURIComponent(publicCompanyId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            resumeUrl: resumeFile?.name || '',
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Nao foi possivel enviar sua candidatura.');
      }

      setSubmitted(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Falha inesperada ao enviar candidatura.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05050a] px-6 py-16 text-white md:px-12">
        <div className="mx-auto flex max-w-5xl items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] py-20">
          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          Carregando vaga...
        </div>
      </div>
    );
  }

  if (submitted && job) {
    return (
      <div className="min-h-screen bg-[#05050a] px-6 py-16 text-white md:px-12">
        <div className="mx-auto max-w-4xl rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 size={38} className="text-emerald-300" />
          </div>
          <h2 className="text-3xl font-semibold">Candidatura recebida</h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-300">
            Sua candidatura para <strong>{job.title}</strong> entrou no pipeline de triagem. O perfil ja foi registrado
            para analise inicial.
          </p>
          <Link href="/jobs" className="mt-8 inline-flex text-sm font-medium text-cyan-300">
            Voltar para vagas
          </Link>
        </div>
      </div>
    );
  }

  if (!job || error) {
    return (
      <div className="min-h-screen bg-[#05050a] px-6 py-16 text-white md:px-12">
        <div className="mx-auto max-w-4xl rounded-3xl border border-rose-500/20 bg-rose-500/10 p-10">
          {error || 'Vaga nao encontrada.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05050a] px-6 py-10 text-white md:px-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/jobs" className="mb-6 inline-flex text-sm text-cyan-300">
          Voltar para vagas
        </Link>

        <div className="rounded-3xl border border-white/10 bg-[#09111d] p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">{job.title}</h1>
              <div className="mt-4 flex flex-wrap gap-5 text-sm text-gray-400">
                <span className="flex items-center gap-2">
                  <Building2 size={16} /> Innovation.ia
                </span>
                <span className="flex items-center gap-2">
                  <MapPin size={16} /> {job.location || 'Localizacao flexivel'}
                </span>
                <span className="flex items-center gap-2">
                  <Briefcase size={16} /> {job.employmentType || 'Modelo a combinar'}
                </span>
                <span className="flex items-center gap-2">
                  <DollarSign size={16} /> {job.salaryRange || 'Faixa sob consulta'}
                </span>
                <span className="flex items-center gap-2">
                  <Users size={16} /> {job._count?.applications ?? 0} candidatos
                </span>
              </div>
            </div>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
              Processo ativo
            </span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.9fr]">
            <div className="space-y-8">
              <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
                <h2 className="mb-4 text-xl font-semibold">Sobre a vaga</h2>
                <p className="text-sm leading-7 text-gray-300">{job.description}</p>
              </section>

              <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
                <h2 className="mb-4 text-xl font-semibold">Pontos que serao analisados</h2>
                <ul className="space-y-3">
                  {requirements.map((requirement) => (
                    <li key={requirement} className="flex items-start gap-3 text-sm text-gray-300">
                      <CheckCircle2 size={18} className="mt-0.5 text-cyan-300" />
                      <span>{requirement}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {job.benefits?.length ? (
                <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
                  <h2 className="mb-4 text-xl font-semibold">Beneficios</h2>
                  <div className="flex flex-wrap gap-3">
                    {job.benefits.map((benefit) => (
                      <span key={benefit} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
                        {benefit}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="rounded-3xl border border-cyan-400/20 bg-[#08101b] p-6">
              <h2 className="text-xl font-semibold">Candidatar-se</h2>
              <p className="mt-2 text-sm text-gray-400">
                Preencha seus dados. O sistema ja cria sua candidatura e faz a triagem inicial.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <FormField label="Nome completo">
                  <input
                    required
                    value={formData.name}
                    onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  />
                </FormField>
                <FormField label="E-mail">
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  />
                </FormField>
                <FormField label="Telefone">
                  <input
                    value={formData.phone}
                    onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  />
                </FormField>
                <FormField label="LinkedIn">
                  <input
                    value={formData.linkedinUrl}
                    onChange={(event) => setFormData((current) => ({ ...current, linkedinUrl: event.target.value }))}
                    placeholder="https://linkedin.com/in/seu-perfil"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  />
                </FormField>
                <FormField label="Curriculo (PDF)">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-4 text-sm text-gray-300 transition hover:border-cyan-400/40">
                    <Upload size={18} className="text-cyan-300" />
                    <span>{resumeFile?.name || 'Selecione o arquivo do curriculo'}</span>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
                    />
                  </label>
                </FormField>
                <FormField label="Apresentacao">
                  <textarea
                    rows={5}
                    value={formData.coverLetter}
                    onChange={(event) => setFormData((current) => ({ ...current, coverLetter: event.target.value }))}
                    placeholder="Conte um pouco do seu contexto, experiencia e interesse pela vaga."
                    className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm outline-none focus:border-cyan-400"
                  />
                </FormField>

                {error ? (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {submitting ? 'Enviando candidatura...' : 'Enviar candidatura'}
                </button>
              </form>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{label}</span>
      {children}
    </label>
  );
}

export default function JobDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#05050a] text-white" />}>
      <JobDetailContent />
    </Suspense>
  );
}
