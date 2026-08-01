'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Check, X, Clock, AlertCircle, ArrowRight, XCircle } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/platform-ui';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TrocasPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('ALL');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({ originalDate: '', targetDate: '', justification: '' });
  const [reviewReason, setReviewReason] = useState('');

  const { data: swapsData, loading: isLoading, error, refetch } = useQuery(() => api.scheduleSwaps.list(), []);
  const swaps = (swapsData || []) as any[];

  const createMutation = useMutation((data: any) => api.scheduleSwaps.create(data), {
    onSuccess: () => {
      setShowRequestForm(false);
      refetch();
    }
  });

  const reviewMutation = useMutation(
    ({ id, action, reason }: any) => api.scheduleSwaps.review(id, action, reason),
    { onSuccess: () => refetch() }
  );

  const cancelMutation = useMutation((id: string) => api.scheduleSwaps.cancel(id), {
    onSuccess: () => refetch()
  });

  const isAdminOrGestor = ['ADMIN', 'RH', 'GESTOR', 'DEV'].includes(user?.role || '');

  if (isLoading) return <LoadingState label="Carregando trocas de escala..." />;
  if (error) return <ErrorState message="Erro ao carregar trocas" retry={refetch} />;

  const filteredSwaps = swaps?.filter((swap: any) => filter === 'ALL' || swap.status === filter) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Trocas e Exceções</h1>
          <p className="page-subtitle">Gerencie solicitações de troca de turno e exceções de escala</p>
        </div>
        {!isAdminOrGestor && (
          <button onClick={() => setShowRequestForm(!showRequestForm)} className="btn-nubank flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Solicitar Troca
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === status ? 'bg-[#8A05BE] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'ALL' ? 'Todas' : status === 'PENDING' ? 'Pendentes' : status === 'APPROVED' ? 'Aprovadas' : status === 'REJECTED' ? 'Recusadas' : 'Canceladas'}
          </button>
        ))}
      </div>

      {showRequestForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-flat p-6 mb-6">
          <h3 className="section-title mb-4">Nova Solicitação de Troca</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Data Original</label>
              <input
                type="date"
                className="form-control"
                value={formData.originalDate}
                onChange={e => setFormData({ ...formData, originalDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Alvo</label>
              <input
                type="date"
                className="form-control"
                value={formData.targetDate}
                onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Justificativa</label>
              <textarea
                className="form-control"
                rows={3}
                value={formData.justification}
                onChange={e => setFormData({ ...formData, justification: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-outline" onClick={() => setShowRequestForm(false)}>Cancelar</button>
            <button 
              className={`btn-nubank ${createMutation.loading ? 'opacity-50 cursor-not-allowed' : ''}`} 
              disabled={createMutation.loading}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.loading ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </div>
        </motion.div>
      )}

      {filteredSwaps.length === 0 ? (
        <EmptyState title="Não há solicitações de troca para exibir" description="Não há solicitações de troca para exibir" />
      ) : (
        <div className="grid gap-4">
          {filteredSwaps.map((swap: any) => (
            <div key={swap.id} className="card-flat p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${swap.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' : swap.status === 'APPROVED' ? 'bg-green-100 text-green-600' : swap.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                  {swap.status === 'PENDING' ? <Clock className="w-6 h-6" /> : swap.status === 'APPROVED' ? <Check className="w-6 h-6" /> : swap.status === 'REJECTED' ? <X className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{swap.requesterName}</h4>
                  <div className="flex items-center text-sm text-gray-500 mt-1 gap-2">
                    <span>{format(new Date(swap.originalDate), 'dd/MM/yyyy')}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>{format(new Date(swap.targetDate), 'dd/MM/yyyy')}</span>
                  </div>
                  <p className="text-sm mt-1">{swap.justification}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {swap.status === 'PENDING' && isAdminOrGestor && (
                  <>
                    <input
                      type="text"
                      placeholder="Motivo (opcional)"
                      className="form-control text-sm py-1 px-2 h-8 w-32"
                      value={reviewReason}
                      onChange={e => setReviewReason(e.target.value)}
                    />
                    <button 
                      className={`btn-icon text-green-600 bg-green-50 ${reviewMutation.loading ? 'opacity-50' : ''}`} 
                      disabled={reviewMutation.loading}
                      onClick={() => reviewMutation.mutate({ id: swap.id, action: 'APPROVED', reason: reviewReason })}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      className={`btn-icon text-red-600 bg-red-50 ${reviewMutation.loading ? 'opacity-50' : ''}`} 
                      disabled={reviewMutation.loading}
                      onClick={() => reviewMutation.mutate({ id: swap.id, action: 'REJECTED', reason: reviewReason })}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                {swap.status === 'PENDING' && swap.requesterId === user?.id && !isAdminOrGestor && (
                  <button 
                    className={`btn-outline text-red-600 border-red-200 hover:bg-red-50 ${cancelMutation.loading ? 'opacity-50' : ''}`} 
                    disabled={cancelMutation.loading}
                    onClick={() => cancelMutation.mutate(swap.id)}
                  >
                    {cancelMutation.loading ? 'Cancelando...' : 'Cancelar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
