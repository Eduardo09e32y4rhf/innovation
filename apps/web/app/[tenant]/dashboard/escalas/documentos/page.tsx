'use client';

import { useState } from 'react';
import { FileText, Download, Plus, X, AlertCircle } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/data-states';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function DocumentosPage() {
  const { user } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // Now api.documents.list() fetches /time-closing endpoints.
  const { data: documentsData, loading, error, refetch } = useQuery(() => api.documents.list());
  const documents = (documentsData || []) as any[];

  const isAuthorized = ['ADMIN', 'RH', 'DEV'].includes(user?.role || '');

  const generateMutation = useMutation(
    (data: any) => api.documents.generate({ month: data.month, year: data.year }),
    {
      onSuccess: () => {
        setIsModalOpen(false);
        toast.success('Fechamento gerado com sucesso!');
        refetch();
      },
      onError: () => {
        toast.error('Erro ao gerar fechamento.');
      }
    }
  );

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate(generateForm);
  };

  const handleDownload = async (doc: any) => {
    try {
      if (doc.status === 'CLOSED') {
        // If it's a closed time-closing for a specific employee
        await api.documents.downloadIndividual(doc.id);
      } else {
        // Just as a fallback
        const formattedMonth = `${doc.year}-${String(doc.month).padStart(2, '0')}`;
        await api.documents.downloadCollective(formattedMonth, doc.employeeId ? [doc.employeeId] : undefined);
      }
    } catch (err) {
      toast.error('Não foi possível baixar o documento. Tente novamente mais tarde.');
    }
  };

  if (loading && !documentsData) return <LoadingState label="Carregando documentos..." />;
  if (error) return <ErrorState message="Erro ao carregar documentos" onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="page-title">Documentos e Relatórios</h1>
          <p className="page-subtitle">Acesse espelhos e PDFs de fechamento de ponto</p>
        </div>
        {isAuthorized && (
          <button 
            className="btn-nubank flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" /> Gerar Fechamento Coletivo
          </button>
        )}
      </div>

      <div className="card-flat overflow-hidden">
        {documents.length === 0 ? (
          <div className="p-8">
            <EmptyState message="Não há fechamentos ou relatórios gerados ainda." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Documento</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Colaborador</th>
                  <th className="px-6 py-4">Competência</th>
                  <th className="px-6 py-4">Data de Criação</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                      <FileText size={16} className="text-[#8A05BE]" />
                      Relatório de Fechamento
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge badge-inactive">
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{doc.employeeName || 'Coletivo'}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{String(doc.month).padStart(2, '0')}/{doc.year}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        className="btn-icon text-[#8A05BE]"
                        title="Baixar PDF"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL GERAR DOCUMENTO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-900">Gerar Fechamento Coletivo</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleGenerate} className="p-6 space-y-4">
                
                <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-xl flex gap-3 items-start mb-4">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>Isso irá consolidar o espelho de ponto de <strong>todos</strong> os colaboradores ativos para o mês e ano selecionados.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Mês</label>
                    <select 
                      required
                      className="form-control w-full" 
                      value={generateForm.month} 
                      onChange={e => setGenerateForm(p => ({...p, month: +e.target.value}))}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Ano</label>
                    <select 
                      required
                      className="form-control w-full" 
                      value={generateForm.year} 
                      onChange={e => setGenerateForm(p => ({...p, year: +e.target.value}))}
                    >
                      {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                  <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                  <button 
                    type="submit" 
                    className={`btn-nubank ${generateMutation.loading ? 'opacity-50' : ''}`}
                    disabled={generateMutation.loading}
                  >
                    {generateMutation.loading ? 'Gerando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
