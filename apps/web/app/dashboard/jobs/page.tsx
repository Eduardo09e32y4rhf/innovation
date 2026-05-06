'use client';

import React, { useEffect, useState } from 'react';
import { Briefcase, MapPin, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { getApiBaseUrl, getAuthHeaders } from '../whatsapp/api';

type Job = {
  id: string;
  title: string;
  location?: string | null;
  employmentType?: string | null;
  status: string;
  _count?: {
    applications: number;
  };
};

export default function JobsDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const loadJobs = async () => {
      const response = await fetch(`${getApiBaseUrl()}/recruitment/jobs`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      setJobs(Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
    };
    void loadJobs();
  }, []);

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Gestao de vagas</h1>
          <p className="text-gray-400">Acompanhe cargos abertos, volume de candidaturas e acesso ao pipeline.</p>
        </div>
        <Link
          href="/jobs"
          className="grad-bg flex items-center gap-2 rounded-2xl px-6 py-3 font-bold shadow-lg shadow-purple-500/20 transition-transform hover:scale-105"
        >
          <Plus size={20} />
          Ver pagina publica
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <div key={job.id} className="glass relative rounded-3xl p-6 hover:scale-[1.01]">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
              <Briefcase size={24} />
            </div>

            <h3 className="mb-2 text-lg font-bold">{job.title}</h3>

            <div className="mb-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin size={16} />
                {job.location || 'Localizacao flexivel'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users size={16} />
                {job._count?.applications ?? 0} candidatos inscritos
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <span className="rounded-full bg-green-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-green-400">
                {job.status}
              </span>
              <Link href="/dashboard/rh/pipeline" className="text-sm font-bold text-purple-400">
                Ver pipeline
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
