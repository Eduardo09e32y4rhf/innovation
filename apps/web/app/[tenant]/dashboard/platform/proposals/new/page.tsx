'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function NewProposalPage() {
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant as string;
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    companyId: '',
    title: 'Proposta Comercial - Innovation RH',
    description: 'Serviços de RH e Ponto Eletrônico',
    startDate: new Date().toISOString().split('T')[0],
    planType: 'PRO',
    monthlyPrice: 199.90,
    usersLimit: 10,
    employeesLimit: 50,
    features: ['time-track', 'vacations', 'management', 'whatsapp'],
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await api.platform.listCompanies();
      setCompanies(data.filter((c: any) => c.status !== 'CANCELLED'));
    } catch (err) {
      toast.error('Erro ao carregar empresas');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId) return toast.error('Selecione uma empresa');
    
    try {
      setLoading(true);
      await api.proposals.create({
        ...formData,
        monthlyPrice: Number(formData.monthlyPrice),
        usersLimit: Number(formData.usersLimit),
        employeesLimit: Number(formData.employeesLimit),
      });
      toast.success('Proposta criada com sucesso!');
      router.push(`/${tenant}/dashboard/platform/proposals`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar proposta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <button className="p-2 hover:bg-muted rounded-md" onClick={() => router.push(`/${tenant}/dashboard/platform/proposals`)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Criar Nova Proposta</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm shadow-slate-900/5">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Empresa Cliente</label>
              <select 
                className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                value={formData.companyId}
                onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.document})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Título da Proposta</label>
                <input className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Data de Início</label>
                <input className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Descrição Opcional</label>
              <input className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Plano / SKU</label>
                <select 
                  className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  value={formData.planType}
                  onChange={e => setFormData({ ...formData, planType: e.target.value })}
                >
                  <option value="STARTUP">Startup</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Valor Mensal (R$)</label>
                <input className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" type="number" step="0.01" required value={formData.monthlyPrice} onChange={e => setFormData({...formData, monthlyPrice: parseFloat(e.target.value)})} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Limite de Usuários Admin</label>
                <input className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" type="number" required value={formData.usersLimit} onChange={e => setFormData({...formData, usersLimit: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Limite de Colaboradores</label>
                <input className="flex h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" type="number" required value={formData.employeesLimit} onChange={e => setFormData({...formData, employeesLimit: parseInt(e.target.value)})} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end p-6 border-t border-slate-100">
            <button className="crystal-button px-5 py-2.5 rounded-xl text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Criar Proposta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
