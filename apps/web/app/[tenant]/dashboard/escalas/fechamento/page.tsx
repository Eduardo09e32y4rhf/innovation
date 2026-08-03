'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Download, CheckCircle, RefreshCcw, Lock, FileText, Send, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/platform-ui';
import { motion, AnimatePresence } from 'framer-motion';

export default function FechamentoPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [reopenReason, setReopenReason] = useState('');
  
  // Confirmação de fechamento
  const [closingToConfirm, setClosingToConfirm] = useState<string | null>(null);

  const { data: closingsData, loading: isLoading, error, refetch } = useQuery(() => api.timeClosing.list(), ['closings', month, year]);
  const closings = (closingsData || []) as any[];

  const generateMutation = useMutation(() => api.timeClosing.generate({ month, year }), { onSuccess: () => refetch() });
  const submitReviewMutation = useMutation((id: string) => api.timeClosing.submitReview(id), { onSuccess: () => refetch() });
  const approveMutation = useMutation((id: string) => api.timeClosing.approve(id), { onSuccess: () => refetch() });
  const closeMutation = useMutation((id: string) => api.timeClosing.close(id), { 
    onSuccess: () => {
      setClosingToConfirm(null);
      refetch();
    } 
  });
  const reopenMutation = useMutation(({ id, reason }: any) => api.timeClosing.reopen(id, reason), { onSuccess: () => refetch() });

  const isAuthorized = ['ADMIN', 'RH', 'DEV', 'MASTER'].includes((user?.role || '').toUpperCase());

  if (!isAuthorized) {
    return <ErrorState message="Acesso restrito a administradores e RH" />;
  }

  if (isLoading && !closingsData) return <LoadingState label="Carregando fechamentos..." />;
  if (error) return <ErrorState message="Erro ao carregar fechamentos" retry={refetch} />;

  const isAnyMutationRunning = generateMutation.loading || submitReviewMutation.loading || approveMutation.loading || closeMutation.loading || reopenMutation.loading;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="page-title">Fechamento de Ponto</h1>
          <p className="page-subtitle">Gerencie o fechamento mensal e pré-folha</p>
        </div>
        <div className="flex gap-2 items-center">
          <select className="form-control w-auto" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
            ))}
          </select>
          <select className="form-control w-auto" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button 
            className={`btn-nubank flex items-center gap-2 ${generateMutation.loading ? 'opacity-50' : ''}`} 
            onClick={() => generateMutation.mutate()}
            disabled={isAnyMutationRunning}
          >
            <RefreshCcw className={`w-4 h-4 ${generateMutation.loading ? 'animate-spin' : ''}`} /> 
            {generateMutation.loading ? 'Gerando...' : 'Gerar Fechamento'}
          </button>
          <button className="btn-outline flex items-center gap-2" onClick={() => api.timeClosing.downloadCollectivePdf(String(month))}>
            <Download className="w-4 h-4" /> PDF Coletivo
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between card-flat p-4 bg-gray-50 border border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-semibold text-gray-900">Fluxo:</span>
          <span>DRAFT</span> <span className="text-gray-400">→</span>
          <span>IN_REVIEW</span> <span className="text-gray-400">→</span>
          <span>APPROVED</span> <span className="text-gray-400">→</span>
          <span>CLOSED</span>
        </div>
      </div>

      {!closings || closings.length === 0 ? (
        <EmptyState title="Não há registros para a competência selecionada" description="Não há registros para a competência selecionada" />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Status</th>
                <th>Salário Base</th>
                <th>Horas Extras</th>
                <th>Descontos</th>
                <th>Bruto</th>
                <th>Líquido</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {closings.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.employeeName}</td>
                  <td>
                    <span className={`badge ${c.status === 'CLOSED' ? 'badge-brand' : 'badge-warn'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>R$ {c.baseSalary?.toFixed(2) || '0.00'}</td>
                  <td>R$ {c.overtimeValue?.toFixed(2) || '0.00'}</td>
                  <td>R$ {c.deductions?.toFixed(2) || '0.00'}</td>
                  <td>R$ {c.grossTotal?.toFixed(2) || '0.00'}</td>
                  <td className="font-semibold text-[#8A05BE]">R$ {c.netTotal?.toFixed(2) || '0.00'}</td>
                  <td>
                    <div className="flex gap-2">
                      {c.status === 'DRAFT' && (
                        <button 
                          className="btn-icon" 
                          title="Enviar para Revisão" 
                          disabled={isAnyMutationRunning}
                          onClick={() => submitReviewMutation.mutate(c.id)}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {c.status === 'IN_REVIEW' && (
                        <button 
                          className="btn-icon text-green-600" 
                          title="Aprovar" 
                          disabled={isAnyMutationRunning}
                          onClick={() => approveMutation.mutate(c.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {c.status === 'APPROVED' && (
                        <button 
                          className="btn-icon text-[#8A05BE]" 
                          title="Fechar Mês" 
                          disabled={isAnyMutationRunning}
                          onClick={() => setClosingToConfirm(c.id)}
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
                      {c.status === 'CLOSED' && (
                        <div className="flex items-center gap-1">
                          <input 
                            type="text" 
                            placeholder="Motivo para reabrir" 
                            className="form-control h-8 w-32 text-xs" 
                            value={reopenReason} 
                            onChange={e => setReopenReason(e.target.value)} 
                          />
                          <button 
                            className="btn-icon text-red-600 disabled:opacity-50" 
                            title="Reabrir" 
                            disabled={!reopenReason || isAnyMutationRunning}
                            onClick={() => reopenMutation.mutate({ id: c.id, reason: reopenReason })}
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CONFIRM MODAL FOR CLOSE */}
      <AnimatePresence>
        {closingToConfirm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Atenção</h3>
                <p className="text-gray-600">
                  Fechar o mês (Lock) irá travar definitivamente todas as marcações de ponto e ocorrências deste colaborador para a competência atual. Esta ação não pode ser desfeita facilmente.
                </p>
                <div className="flex justify-center gap-3 mt-6">
                  <button className="btn-outline" onClick={() => setClosingToConfirm(null)}>
                    Cancelar
                  </button>
                  <button 
                    className="btn-nubank bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700" 
                    onClick={() => closeMutation.mutate(closingToConfirm)}
                    disabled={closeMutation.loading}
                  >
                    {closeMutation.loading ? 'Fechando...' : 'Sim, Fechar Mês'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
