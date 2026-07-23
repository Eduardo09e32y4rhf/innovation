"use client";

import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { Check, X, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

export function PendingNotificationsGate({ children }: { children: ReactNode }) {
  const { data: widget, refetch } = useQuery(() => api.notifications.dashboardWidget(), [], { pollMs: 30000 });
  const [submitting, setSubmitting] = useState(false);

  const respondMut = useMutation(
    ({ id, action }: { id: string; action: 'ACKNOWLEDGE' | 'ACCEPT' | 'REFUSE' }) => api.notifications.respond(id, action),
    {
      onSuccess: () => {
        setSubmitting(false);
        refetch();
      },
      onError: (err) => {
        setSubmitting(false);
        alert(err);
      }
    }
  );

  if (!widget) return <>{children}</>;

  const pendingNotification = widget.notifications?.find(
    (n: any) => n.recipients?.[0]?.status === 'PENDING_RESPONSE'
  );

  if (!pendingNotification) return <>{children}</>;

  const handleAction = (action: 'ACKNOWLEDGE' | 'ACCEPT' | 'REFUSE') => {
    setSubmitting(true);
    respondMut.mutate({ id: pendingNotification.id, action });
  };

  const isPenalty = pendingNotification.type === 'WARNING_NOTICE' || pendingNotification.type === 'SUSPENSION_NOTICE';
  const docTitle = pendingNotification.type === 'WARNING_NOTICE' ? 'AVISO DE ADVERTÊNCIA ESCRITA' : pendingNotification.type === 'SUSPENSION_NOTICE' ? 'AVISO DE SUSPENSÃO DISCIPLINAR' : pendingNotification.title.toUpperCase();

  return (
    <>
      {children}
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/95 p-4 sm:p-8 backdrop-blur-md overflow-y-auto">
        <div className="w-full w-full bg-white shadow-2xl my-auto p-8 sm:p-16 text-slate-900 border-t-8 border-slate-900 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-6 mb-8 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider">{docTitle}</h1>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">DOCUMENTO OFICIAL COM VALIDADE JURÍDICA</p>
            </div>
            <FileText size={48} className="text-slate-800 shrink-0 hidden sm:block" />
          </div>

          {/* Document Body */}
          <div className="space-y-6 text-sm sm:text-base leading-relaxed text-justify text-slate-800">
            {isPenalty ? (
              <>
                <p>
                  Pelo presente documento, aplicamos-lhe a pena de <strong>{docTitle}</strong>, em virtude da seguinte ocorrência disciplinar verificada no dia <strong>{pendingNotification.extraJson?.occurrenceDate ? new Date(pendingNotification.extraJson.occurrenceDate).toLocaleDateString('pt-BR') : '____/____/______'}</strong>:
                </p>
                
                <div className="bg-slate-100 p-5 border-l-4 border-slate-900 font-bold text-slate-900">
                  Motivo / Embargo Legal: {pendingNotification.extraJson?.legalReason}
                </div>

                {pendingNotification.message && (
                  <div className="pt-4">
                    <strong className="text-slate-900 uppercase tracking-wide text-xs">Detalhes Adicionais da Infração:</strong>
                    <p className="mt-3 whitespace-pre-wrap font-medium">{pendingNotification.message}</p>
                  </div>
                )}

                {pendingNotification.type === 'SUSPENSION_NOTICE' && (
                  <div className="font-bold uppercase border-2 border-slate-900 p-6 text-center mt-8 text-slate-900">
                    Por consequência, o(a) Sr(a). fica suspenso(a) de suas atividades por {pendingNotification.extraJson?.suspensionDays || '___'} dia(s), com desconto em folha de pagamento.
                  </div>
                )}
              </>
            ) : (
              <div className="whitespace-pre-wrap">{pendingNotification.message}</div>
            )}
            
            {pendingNotification.extraJson?.resetCode && (
              <div className="mt-8 border-2 border-slate-900 p-6 text-center bg-slate-50">
                <p className="mb-2 text-xs font-bold text-slate-600 uppercase">Código de Acesso</p>
                <code className="text-2xl font-black tracking-[0.2em] text-slate-900">
                  {pendingNotification.extraJson.resetCode}
                </code>
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="mt-24 grid sm:grid-cols-2 gap-16 sm:gap-12">
            <div className="text-center">
              <div className="border-t-2 border-slate-900 pt-4">
                <p className="font-bold text-sm sm:text-base">{pendingNotification.createdByUser?.name || 'Recursos Humanos'}</p>
                <p className="text-xs text-slate-500 mt-1 uppercase font-semibold">Assinatura Eletrônica (Empregador/RH)</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-slate-900 pt-4">
                <p className="font-bold text-sm sm:text-base text-transparent select-none">Assinatura do Funcionário</p>
                <p className="text-xs text-slate-500 mt-1 uppercase font-semibold">Assinatura do Funcionário</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-20 flex flex-col gap-5 bg-slate-100 p-6 sm:p-8 rounded-[12px] border border-slate-300">
            <p className="text-xs text-slate-500 text-center uppercase tracking-widest font-black mb-1">Ação Requerida</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              {pendingNotification.allowsRefusal && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAction('REFUSE')}
                  className="flex items-center justify-center gap-2 rounded-[8px] border-2 border-slate-900 bg-white px-8 py-3.5 text-xs sm:text-sm font-black text-slate-900 transition-all hover:bg-slate-200 disabled:opacity-50"
                >
                  <X size={18} />
                  RECUSAR ASSINATURA
                </button>
              )}
              {pendingNotification.requiresAcceptance ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAction('ACCEPT')}
                  className="flex items-center justify-center gap-2 rounded-[8px] bg-slate-900 px-8 py-3.5 text-xs sm:text-sm font-black text-white shadow-xl transition-all hover:bg-slate-800 disabled:opacity-50"
                >
                  <Check size={18} />
                  ASSINAR E ACEITAR TERMOS
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAction('ACKNOWLEDGE')}
                  className="flex items-center justify-center gap-2 rounded-[8px] bg-slate-900 px-8 py-3.5 text-xs sm:text-sm font-black text-white shadow-xl transition-all hover:bg-slate-800 disabled:opacity-50"
                >
                  <Check size={18} />
                  ESTOU CIENTE
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
