'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapPin, Briefcase, DollarSign, Clock, CheckCircle2, Send, Paperclip, Upload, Loader2, Building, Users } from 'lucide-react';
import Link from 'next/link';

// Mock jobs API - replace with real API call
const mockJobs = {
  '1': {
    id: '1',
    title: 'Desenvolvedor Full Stack Senior',
    type: 'CLT',
    location: 'Remoto',
    salary: 'R$ 12k - 18k',
    company: 'Innovation.ia',
    description: 'Buscamos um talento para integrar nosso time de engenharia e ajudar a escalar a plataforma Innovation.ia. Você será responsável por arquitetar soluções em React, Node.js e integrar modelos de IA generativa.',
    requirements: ['5+ anos com React & Node.js', 'Experiência com Next.js e TypeScript', 'Conhecimento em Prisma/PostgreSQL', 'Familiaridade com Docker e Cloud'],
    benefits: ['Remote-first', 'Equity', 'Health insurance', 'Learning budget', 'Flexible hours'],
    postedAt: '2026-02-28',
    candidates: 12,
    status: 'OPEN',
  },
  '2': {
    id: '2',
    title: 'Engenheiro de Machine Learning',
    type: 'CLT',
    location: 'São Paulo, SP',
    salary: 'R$ 15k - 22k',
    company: 'Innovation.ia',
    description: 'Joined our AI team to build next-generation generative AI models. Work with cutting-edge LLMs and transformer architectures.',
    requirements: ['Python avançado', 'TensorFlow/PyTorch', 'Experiência com LLMs', 'PhD desejável'],
    benefits: ['Remote-first', 'GPU budget', 'Conference attendance', 'Health insurance'],
    postedAt: '2026-03-01',
    candidates: 8,
    status: 'OPEN',
  },
  '3': {
    id: '3',
    title: 'UX Designer',
    type: 'PJ',
    location: 'Remoto',
    salary: 'R$ 8k - 12k',
    company: 'Innovation.ia',
    description: 'Design user-centered experiences for our AI-powered products. Create intuitive interfaces that make AI accessible to everyone.',
    requirements: ['Figma avançado', 'Portfólio premium', 'Design Systems', 'Pesquisa com usuários'],
    benefits: ['Remote-first', 'Flexible hours', 'Creative freedom'],
    postedAt: '2026-02-25',
    candidates: 24,
    status: 'OPEN',
  },
  '4': {
    id: '4',
    title: 'Tech Lead - Backend',
    type: 'CLT',
    location: 'São Paulo, SP (Híbrido)',
    salary: 'R$ 20k - 28k',
    company: 'Innovation.ia',
    description: 'Lead technical decisions and mentor engineering team. Drive architecture and ensure code quality across the backend.',
    requirements: ['7+ anos Backend', 'Experiência como Tech Lead', 'Arquitetura de sistemas', 'PostgreSQL/AWS'],
    benefits: ['Leadership bonus', 'Equity', 'Health insurance', 'Gym membership'],
    postedAt: '2026-02-20',
    candidates: 5,
    status: 'OPEN',
  },
};

export default function JobDetailPage() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('id') || '1';
  
  const [job, setJob] = useState(mockJobs[jobId as keyof typeof mockJobs] || mockJobs['1']);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', linkedin: '', coverLetter: '' });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id && mockJobs[id as keyof typeof mockJobs]) {
      setJob(mockJobs[id as keyof typeof mockJobs]);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#05050a] text-white p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <div className="glass p-12 rounded-3xl text-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h2 className="text-3xl font-extrabold mb-4">Candidatura Enviada!</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Obrigado por se candidatar à vaga de {job.title}. Nossa equipe IA está analisando seu perfil e logo entraremos em contato.
            </p>
            <Link 
              href="/jobs"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              ← Ver todas as vagas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05050a] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Job Header */}
        <div className="glass p-8 rounded-3xl mb-8 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <Link 
              href="/jobs"
              className="text-purple-400 text-sm mb-4 inline-flex items-center gap-1 hover:text-purple-300 transition-colors"
            >
              ← Voltar às vagas
            </Link>
            <span className={`px-3 py-1 bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4 inline-block ml-2`}>
              {job.status === 'OPEN' ? 'Vaga Aberta' : 'Encerrada'}
            </span>
            <h1 className="text-4xl font-extrabold mb-4 tracking-tight">{job.title}</h1>
            
            <div className="flex items-center gap-2 text-gray-400 mb-6">
              <Building size={18} />
              {job.company}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-gray-400">
              <div className="flex items-center gap-2 text-sm"><MapPin size={18} /> {job.location}</div>
              <div className="flex items-center gap-2 text-sm"><Briefcase size={18} /> {job.type}</div>
              <div className="flex items-center gap-2 text-sm"><DollarSign size={18} /> {job.salary}</div>
              <div className="flex items-center gap-2 text-sm"><Users size={18} /> {job.candidates} candidatos</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Job Description */}
          <div className="lg:col-span-2 space-y-8">
            <section className="glass p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-4">Sobre a Vaga</h3>
              <p className="text-gray-400 leading-relaxed">
                {job.description}
              </p>
            </section>

            <section className="glass p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-4">Requisitos</h3>
              <ul className="space-y-3">
                {job.requirements.map((req, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-400">
                    <CheckCircle2 size={18} className="text-green-500" /> {req}
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-4">Benefícios</h3>
              <ul className="space-y-3">
                {job.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-400">
                    <CheckCircle2 size={18} className="text-purple-500" /> {benefit}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Apply Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass p-8 rounded-3xl sticky top-8 border-purple-500/30">
              <h3 className="text-xl font-bold mb-6">Candidatar-se</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2">E-mail</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Telefone</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2">LinkedIn (opcional)</label>
                  <input 
                    type="url" 
                    value={formData.linkedin}
                    onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                    placeholder="https://linkedin.com/in/seu-perfil"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Currículo (PDF)</label>
                  <label className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:bg-white/5 transition-colors cursor-pointer block">
                    {file ? (
                      <div className="flex items-center justify-center gap-2 text-purple-400">
                        <Paperclip size={18} />
                        <span className="text-sm">{file.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto text-gray-500 mb-2" />
                        <p className="text-xs text-gray-400">Arraste seu currículo (PDF)</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                    />
                  </label>
                </div>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full grad-bg py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Enviar Candidatura
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
