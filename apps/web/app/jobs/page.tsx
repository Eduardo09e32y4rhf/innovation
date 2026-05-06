'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Briefcase, Building2, MapPin, Search, Users } from 'lucide-react';
import Link from 'next/link';

type Job = {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  employmentType?: string | null;
  salaryRange?: string | null;
  status: string;
  benefits?: string[];
  _count?: {
    applications: number;
  };
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const publicCompanyId = process.env.NEXT_PUBLIC_DEFAULT_COMPANY_ID || '00000000-0000-0000-0000-000000000001';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${apiBaseUrl}/recruitment/public/jobs?companyId=${encodeURIComponent(publicCompanyId)}`,
        );
        if (!response.ok) {
          throw new Error('Nao foi possivel carregar as vagas publicas.');
        }
        const data = await response.json();
        setJobs(Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : 'Falha inesperada ao carregar as vagas.',
        );
      } finally {
        setLoading(false);
      }
    };

    void loadJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const normalizedLocation = (job.location || '').toLowerCase();
      const matchesSearch =
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation =
        locationFilter === 'all' || normalizedLocation.includes(locationFilter.toLowerCase());
      return matchesSearch && matchesLocation;
    });
  }, [jobs, locationFilter, searchTerm]);

  return (
    <div className="min-h-screen bg-[#05050a] text-white">
      <section className="border-b border-white/5 px-6 py-20 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
              Recrutamento Innovation
            </p>
            <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">Vagas abertas</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
              Encontre a vaga certa, envie sua candidatura e entre no pipeline completo de triagem da plataforma.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-[1fr_240px]">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <Search size={18} className="text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por cargo, tecnologia ou palavra-chave"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
              />
            </label>

            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white outline-none"
            >
              <option value="all">Todas as localizacoes</option>
              <option value="remoto">Remoto</option>
              <option value="sao paulo">Sao Paulo</option>
              <option value="hibrido">Hibrido</option>
            </select>
          </div>
        </div>
      </section>

      <section className="px-6 py-14 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {loading ? 'Carregando vagas...' : `${filteredJobs.length} vaga${filteredJobs.length === 1 ? '' : 's'}`}
            </h2>
          </div>

          {error ? (
            <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-6 py-5 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {!loading && !error && filteredJobs.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-16 text-center">
              <Briefcase size={42} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold">Nenhuma vaga encontrada</h3>
              <p className="mt-2 text-sm text-gray-500">Ajuste os filtros para explorar outras oportunidades.</p>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            {filteredJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/detail?id=${job.id}`}
                className="rounded-3xl border border-white/10 bg-[#09111d] p-7 transition hover:border-cyan-400/40 hover:bg-[#0b1627]"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-300">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{job.title}</h3>
                      <p className="mt-1 text-sm text-gray-400">Innovation.ia</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                    Aberta
                  </span>
                </div>

                <p className="line-clamp-3 text-sm leading-7 text-gray-400">{job.description}</p>

                <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    {job.location || 'Localizacao flexivel'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} />
                    {job.employmentType || 'Modelo a combinar'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    {job._count?.applications ?? 0} candidatos
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                  <span className="text-sm text-gray-500">{job.salaryRange || 'Faixa salarial sob consulta'}</span>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300">
                    Ver detalhes <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
