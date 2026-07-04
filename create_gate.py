file_path = 'apps/web/app/dashboard/_components/pending-notifications-gate.tsx'

content = '''"use client";

import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { AlertTriangle, Check, X } from 'lucide-react';
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

  return (
    <>
      {children}
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-2xl animate-in zoom-in-95 fade-in duration-300">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                <AlertTriangle size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black">{pendingNotification.title}</h2>
                <p className="text-xs font-semibold text-amber-50">Você tem uma pendência que requer sua atenção</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="mb-6 rounded-[12px] border border-amber-100 bg-amber-50/50 p-4 text-sm font-semibold text-slate-700 whitespace-pre-wrap">
              {pendingNotification.message}
            </div>

            {pendingNotification.extraJson?.resetCode && (
              <div className="mb-6 rounded-[12px] border border-teal-100 bg-teal-50/50 p-4 text-center">
                <p className="mb-2 text-xs font-bold text-teal-800">Código de Acesso</p>
                <code className="rounded-[4px] border border-teal-200 bg-white px-3 py-1.5 text-lg font-black tracking-[0.2em] text-slate-900">
                  {pendingNotification.extraJson.resetCode}
                </code>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {pendingNotification.allowsRefusal && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAction('REFUSE')}
                  className="flex items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  <X size={16} />
                  Recusar
                </button>
              )}
              {pendingNotification.requiresAcceptance ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAction('ACCEPT')}
                  className="flex items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-xs font-black text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                >
                  <Check size={16} />
                  Li e Aceito
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAction('ACKNOWLEDGE')}
                  className="flex items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-2.5 text-xs font-black text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                >
                  <Check size={16} />
                  Estou ciente
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
'''

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Gate created')
