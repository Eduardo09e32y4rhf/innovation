'use client';

import { useState } from 'react';
import { FileText, Download, Filter, Plus, X } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/platform-ui';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentosPage() {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    employeeId: '',
    type: 'ESPELHO_PONTO',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const { data: documentsData, loading, error, refetch } = useQuery(() => api.documents.list());
  const documents = (documentsData || []) as any[];

  const isAuthorized = ['ADMIN', 'RH'].includes(user?.role || '');

  const { data: employeesData } = useQuery(
    () => isAuthorized ? api.employees.list() : Promise.resolve([]),
    [isAuthorized]
  );
  const employees = (employeesData || []) as any[];

  const generateMutation = useMutation(
    (data: any) => api.documents.generate(data),
    {
      onSuccess: () => {
        setIsModalOpen(false);
        refetch();
      }
    }
  );

  const docTypeLabels: Record<string, string> = {
    ESPELHO_PONTO: 'Espelho de Ponto',
    FOLHA_PONTO: 'Folha de Ponto',
    FECHAMENTO: 'Fechamento',
    PRE_FOLHA: 'Pré-folha'
  };

  const filteredDocs = documents.filter((doc: any) => filterType === 'ALL' || doc.type === filterType) || [];

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate(generateForm);
  };

  if (loading && !documentsData) return <LoadingState label="Carregando documentos..." />;
  if (error) return <ErrorState message="Erro ao carregar documentos" retry={refetch} />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="page-title">Documentos</h1>
          <p className="page-subtitle">Acesse relatórios, espelhos e folhas de ponto</p>
        </div>
        {isAuthorized && (
          <button 
            className="btn-nubank flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" /> Gerar Documento
          </button>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select 
            className="form-control w-48 text-sm"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="ALL">Todos os tipos</option>
            <option value="ESPELHO_PONTO">Espelho de Ponto</option>
            <option value="FOLHA_PONTO">Folha de Ponto</option>
            <option value="FECHAMENTO">Fechamento</option>
            <option value="PRE_FOLHA">Pré-folha</option>
          </select>
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <EmptyState title="Nenhum documento" description="Não encontramos documentos com os filtros atuais"  />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Tipo</th>
                <th>Funcionário</th>
                <th>Competência</th>
                <th>Data de Geração</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc: any) => (
                <tr key={doc.id}>
                  <td className="font-medium text-gray-900">{doc.name || `Documento #${doc.id}`}</td>
                  <td>
                    <span className="badge badge-inactive">
                      {docTypeLabels[doc.type] || doc.type}
                    </span>
                  </td>
                  <td>{doc.employeeName || '-'}</td>
                  <td>{doc.month}/{doc.year}</td>
                  <td>{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="text-right">
                    <button 
                      className="btn-icon text-[#8A05BE]"
                      title="Baixar PDF"
                      onClick={() => api.documents.download(doc.id)}
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

      {/* MODAL GERAR DOCUMENTO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-gray-800">Gerar Novo Documento</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleGenerate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador</label>
                  <select 
                    required 
                    className="form-control w-full"
                    value={generateForm.employeeId}
                    onChange={e => setGenerateForm(prev => ({ ...prev, employeeId: e.target.value }))}
                  >
                    <option value="">Selecione um funcionário...</option>
                    {employees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
                  <select 
                    required 
                    className="form-control w-full"
                    value={generateForm.type}
                    onChange={e => setGenerateForm(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="ESPELHO_PONTO">Espelho de Ponto Analítico</option>
                    <option value="PRE_FOLHA">Pré-folha (Resumo de Fechamento)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
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

                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                  <button 
                    type="submit" 
                    className={`btn-nubank ${generateMutation.loading ? 'opacity-50' : ''}`}
                    disabled={generateMutation.loading}
                  >
                    {generateMutation.loading ? 'Gerando...' : 'Gerar Documento'}
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
