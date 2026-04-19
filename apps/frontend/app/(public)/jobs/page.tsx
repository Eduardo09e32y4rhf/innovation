"use client";

import { useState, useEffect } from 'react';
import { Search, MapPin, DollarSign, Briefcase, Calendar, Users, CheckCircle2, Send, Loader2, Plus, X } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { JobsService } from '@/services/api';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: 'full-time' | 'part-time' | 'contract' | 'remote';
  publishedAt: string;
  applicants: number;
}

export default function JobsLanding() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newJobModal, setNewJobModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    salary: '',
    description: '',
    type: 'full-time' as Job['type']
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const data = await JobsService.listPublic();
      setJobs(data);
    } catch (error) {
      console.error('Erro ao carregar vagas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await JobsService.createPublicJob(formData);
      setNewJobModal(false);
      setFormData({ title: '', company: '', location: '', salary: '', description: '', type: 'full-time' });
      fetchJobs(); // Refresh list
    } catch (error) {
      console.error('Erro ao criar vaga:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(search.toLowerCase()) ||
    job.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Vagas Innovation.ia
              </h1>
              <p className="text-slate-500 mt-1">Oportunidades selecionadas por IA</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por cargo ou empresa..."
                  className="w-64 pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                onClick={() => setNewJobModal(true)}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Publicar Vaga
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mr-3" />
            <span>Carregando vagas...</span>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-32">
            <Briefcase className="w-24 h-24 text-slate-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Nenhuma vaga encontrada</h2>
            <p className="text-slate-500 mb-8">Seja o primeiro a publicar uma oportunidade</p>
            <button
              onClick={() => setNewJobModal(true)}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Publicar Vaga
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <div key={job.id} className="group bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-indigo-100 transition-all overflow-hidden">
                <div className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">
                        {job.type === 'remote' ? 'Remoto' : job.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      {job.applicants > 0 && (
                        <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {job.applicants}
                        </div>
                      )}
                    </div>
                    <Calendar className="text-slate-400 w-5 h-5 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {job.title}
                  </h3>
                  <p className="text-slate-600 mb-6 line-clamp-3">{job.company} — {job.location}</p>
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-2xl font-black text-indigo-600">
                      {job.salary || 'A combinar'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(job.publishedAt).toLocaleDateString('pt-BR', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </div>
                  </div>
                  <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-wider hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/25 transition-all shadow-lg flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Candidatar-se
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Job Modal */}
        {newJobModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900">Publicar Nova Vaga</h2>
                <button onClick={() => setNewJobModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmitJob} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Título da Vaga *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Desenvolvedor Fullstack Senior"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Empresa *</label>
                  <input
                    required
                    type="text"
                    placeholder="Sua Empresa LTDA"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Localidade</label>
                    <input
                      type="text"
                      placeholder="Remoto ou São Paulo, SP"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Salário</label>
                    <input
                      type="text"
                      placeholder="R$ 5.000 - R$ 8.000"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={formData.salary}
                      onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Descrição</label>
                  <textarea
                    rows={4}
                    placeholder="Responsabilidades, requisitos e benefícios..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-vertical"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Vaga</label>
                  <select
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as Job['type']})}
                  >
                    <option value="full-time">Tempo Integral</option>
                    <option value="part-time">Meio Período</option>
                    <option value="contract">Contrato</option>
                    <option value="remote">100% Remoto</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Publicar Vaga
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="text-center py-20">
          <p className="text-slate-500 text-lg font-medium">Vagas impulsionadas por IA</p>
        </div>
      </main>
    </div>
  );
}

