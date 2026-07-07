'use client';
import { useParams } from 'next/navigation';

import { Bell, X } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { useState, useRef, useEffect } from 'react';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const widget = useQuery(() => api.notifications.dashboardWidget(), [], { pollMs: 15000 });
  const markReadMut = useMutation((id: string) => api.notifications.markAsRead(id), { onSuccess: () => widget.refetch() });
  const markAllReadMut = useMutation(() => api.notifications.markAllAsRead(), { onSuccess: () => widget.refetch() });

  const unreadCount = widget.data?.unreadCount ?? 0;
  const notifications = widget.data?.notifications ?? [];
  const prevCountRef = useRef(0);

  useEffect(() => {
    // Request permission if not granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    // Check if we have new unread messages
    if (unreadCount > prevCountRef.current && prevCountRef.current !== 0) {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const latest = notifications[0];
        if (latest) {
          new Notification(latest.title || 'Nova notificação', {
            body: latest.message || 'Você tem uma nova notificação.',
            icon: '/favicon.ico'
          });
        }
      }
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount, notifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const priorityCls: Record<string, string> = {
    URGENT: 'border-rose-200 bg-rose-50',
    HIGH: 'border-amber-200 bg-amber-50',
    NORMAL: 'border-slate-200 bg-white',
    LOW: 'border-slate-100 bg-slate-50',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-700 transition-all hover:border-teal-500 hover:text-teal-700"
      >
        <Bell size={18} strokeWidth={2.5} />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-600 px-1 text-[10px] font-black text-white shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[110%] z-[99999] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-xs font-black text-slate-950">Notificações</h3>
              <p className="text-[10px] font-semibold text-slate-500">{unreadCount} não lidas</p>
            </div>
            <div className="flex gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllReadMut.mutate()}
                  className="text-[10px] font-black text-teal-700 hover:text-teal-800"
                >
                  Marcar todas
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {widget.loading && <p className="px-4 py-6 text-center text-xs text-slate-500">Carregando...</p>}
            {widget.error && <p className="px-4 py-6 text-center text-xs text-rose-600">{widget.error}</p>}
            {!widget.loading && !widget.error && notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-slate-500">Nenhuma notificação.</p>
            )}
            {notifications.map((n: any) => (
              <div
                key={n.id}
                className={`flex flex-col gap-1 border-b border-slate-100 px-4 py-3 transition-all hover:bg-slate-50/70 ${(n.recipients?.[0]?.status === 'UNREAD' || n.recipients?.[0]?.status === 'PENDING_RESPONSE') ? 'bg-blue-50/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-slate-950">{n.title}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-600 line-clamp-2">{n.message}</p>
                    {n.extraJson?.resetCode && (
                      <div className="mt-2 mb-1 flex items-center justify-between rounded-[6px] border border-teal-100 bg-teal-50/50 p-2 shadow-sm">
                        <code className="rounded-[4px] bg-white px-2 py-0.5 text-xs font-black tracking-[0.2em] text-slate-900 border border-slate-200">{n.extraJson.resetCode}</code>
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(n.extraJson.resetCode); alert('Código copiado!'); }} 
                          className="inline-flex h-6 items-center rounded-[4px] bg-white border border-slate-200 px-2 text-[9px] font-black uppercase text-teal-600 shadow-sm transition-all hover:bg-teal-50"
                        >
                          Copiar
                        </button>
                      </div>
                    )}
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">
                      {new Date(n.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-[5px] border px-1.5 py-0.5 text-[9px] font-black ${priorityCls[n.priority] ?? priorityCls.NORMAL}`}>
                    {n.priority}
                  </span>
                </div>
                <div className="flex justify-end gap-1.5">
                  {(n.recipients?.[0]?.status === 'UNREAD' || n.recipients?.[0]?.status === 'PENDING_RESPONSE') && (
                    <button
                      type="button"
                      onClick={() => markReadMut.mutate(n.id)}
                      disabled={markReadMut.loading}
                      className="text-[10px] font-black text-teal-700 hover:text-teal-800 disabled:opacity-60"
                    >
                      Marcar lida
                    </button>
                  )}
                  {n.targetUrl && (
                    <Link
                      href={n.targetUrl}
                      onClick={() => setOpen(false)}
                      className="text-[10px] font-black text-slate-700 hover:text-slate-900"
                    >
                      Abrir
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center">
            <Link href={`/${useParams().tenant}/dashboard/notifications`} onClick={() => setOpen(false)} className="text-[11px] font-black text-teal-700 hover:text-teal-800">
              Ver todas as notificações
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}