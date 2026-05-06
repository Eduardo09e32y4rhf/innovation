'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, Clock, ChevronRight, Building, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Mock jobs data - replace with API call
const mockJobs = [
  {
    id: '1',
    title: 'Desenvolvedor Full Stack Senior',
    type: 'CLT',
    location: 'Remoto',
    salary: 'R$ 12k - 18k',
    company: 'Innovation.ia',
    description: 'Buscamos um talento para integrar nosso time de engenharia e ajudar a escalar a plataforma Innovation.ia.',
    requirements: ['5+ anos com React & Node.js', 'Experiência com Next.js e TypeScript', 'Conhecimento em Prisma/PostgreSQL'],
    postedAt: '2026-02-28',
    candidates: 12,
    status: 'OPEN',
  },
  {
    id: '2',
    title: 'Engenheiro de Machine Learning',
    type: 'CLT',
    location: 'São Paulo, SP',
    salary: 'R$ 15k - 22k',
    company: 'Innovation.ia',
    description: 'Joined our AI team to build next-generation generative AI models.',
    requirements: ['Python avançado', 'TensorFlow/PyTorch', 'Experiência com LLMs', 'PhD desejável'],
    postedAt: '2026-03-01',
    candidates: 8,
    status: 'OPEN',
  },
  {
    id: '3',
    title: 'UX Designer',
    type: 'PJ',
    location: 'Remoto',
    salary: 'R$ 8k - 12k',
    company: 'Innovation.ia',
    description: 'Design user-centered experiences for our AI-powered products.',
    requirements: ['Figma avançado', 'Portfólio premium', 'Design Systems', 'Pesquisa com usuários'],
    postedAt: '2026-02-25',
    candidates: 24,
    status: 'OPEN',
  },
  {
    id: '4',
    title: 'Tech Lead - Backend',
    type: 'CLT',
    location: 'São Paulo, SP (Híbrido)',
    salary: 'R$ 20k - 28k',
    company: 'Innovation.ia',
    description: 'Lead technical decisions and mentor engineering team.',
    requirements: ['7+ anos Backend', 'Experiência como Tech Lead', 'Arquitetura de sistemas', 'PostgreSQL/AWS'],
    postedAt: '2026-02-20',
    candidates: 5,
    status: 'OPEN',
  },
];

const JobCard = ({ job }) => (
  <Link 
    href={`/jobs/detail?id=${job.id}`}
    className="group glass p-8 rounded-3xl hover:border-purple-500/50 transition-all cursor-pointer block"
  >
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl grad-bg flex items-center justify-center">
          <Building size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold group-hover:text-purple-400 transition-colors">{job.title}</h3>
          <p className="text-gray-400 text-sm">{job.company}</p>
        </div>
      </div>
      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
        job.status === 'OPEN' 
          ? 'bg-emerald-50/10 text-emerald-400 border-emerald-500/20' 
          : 'bg-slate-50/10 text-slate-400 border-slate-500/20'
      }`}>
        {job.status === 'OPEN' ? 'Vaga Aberta' : 'Encerrada'}
      </span>
    </div>

    <p className="text-gray-400 text-sm mb-6 line-clamp-2">{job.description}</p>

    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
      <div className="flex items-center gap-2">
        <MapPin size={16} />
        {job.location}
      </div>
      <div className="flex items-center gap-2">
        <Briefcase size={16} />
        {job.type}
      </div>
      <div className="flex items-center gap-2">
        <Users size={16} />
        {job.candidates} candidatos
      </div>
    </div>

    <div className="flex items-center justify-between pt-6 border-t border-white/5">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Clock size={16} />
        Publicada {job.postedAt}
      </div>
      <div className="flex items-center gap-2 text-purple-400 text-sm font-bold group-hover:gap-3 transition-all">
        Ver Detalhes <ArrowRight size={16} />
      </div>
    </div>
  </Link>
);

export default function JobsPage() {
  const [jobs, setJobs] = useState(mockJobs);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === 'all' || job.location.toLowerCase().includes(locationFilter);
    const matchesType = typeFilter === 'all' || job.type === typeFilter;
    return matchesSearch && matchesLocation && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#05050a] text-white">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            Vagas <span className="text-transparent bg-clip-text grad-bg">Abertas</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
            Junte-se à revolução da IA. Buscamos talentos para construir o futuro da tecnologia.
          </p>

          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Buscar vagas por título, tecnologia ou palavra-chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-14 pr-6 text-lg outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 mb-12">
        <div className="flex flex-wrap gap-4">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl py-3 px-5 outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todas as lokalidades</option>
            <option value="remoto">Remoto</option>
            <option value="sp">São Paulo</option>
            <option value="hibrido">Híbrido</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl py-3 px-5 outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todos os tipos</option>
            <option value="CLT">CLT</option>
            <option value="PJ">PJ</option>
          </select>
        </div>
      </section>

      {/* Jobs Grid */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">
            {filteredJobs.length} vaga{filteredJobs.length !== 1 ? 's' : ''} encontrada{filteredJobs.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 glass rounded-3xl">
            <Briefcase size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Nenhuma vaga encontrada</h3>
            <p className="text-gray-500">Tente ajustar seus filtros de busca.</p>
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="relative py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Não encontrou a vaga ideal?</h2>
          <p className="text-gray-400 mb-8">
            Sempre estamos buscando talentos.excelentes. Envie seu currículo e我们来联系你 quando houver uma oportunidade.
          </p>
          <button className="grad-bg px-8 py-4 rounded-full font-bold flex items-center gap-2 mx-auto hover:scale-105 transition-transform">
            Enviar Currículo <ChevronRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
}
