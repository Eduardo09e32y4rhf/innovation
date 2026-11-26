'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { request } from '@/app/lib/api';

type Notice = { id: string; title: string; body: string; type: 'FEATURE' | 'TERMS'; publishedAt: string; isRead: boolean };

export function PlatformNoticesBanner() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const admin = String(user?.profile ?? user?.role ?? '').toUpperCase() === 'ADMIN';
  useEffect(() => {
    if (!admin) { setNotices([]); return; }
    let canceled = false;
    request<Notice[]>('/commercial/email/notices', { silent: true }).then(rows => { if (!canceled) setNotices(rows.filter(row => !row.isRead)); }).catch(() => undefined);
    return () => { canceled = true; };
  }, [admin, user?.id]);
  async function acknowledge(id: string) {
    setBusyId(id);
    try { await request(`/commercial/email/notices/${encodeURIComponent(id)}/ack`, { method: 'POST', body: {} }); setNotices(rows => rows.filter(row => row.id !== id)); } catch { /* Keep the notice visible if the acknowledgement could not be saved. */ }
    finally { setBusyId(null); }
  }
  if (!admin || !notices.length) return null;
  return <aside aria-label="Comunicados da plataforma" className="mx-4 mt-4 space-y-3 lg:mx-6">
    {notices.map(notice => <article key={notice.id} className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-950 shadow-sm">
      <div className="flex items-start gap-3"><Megaphone className="mt-0.5 shrink-0 text-violet-700" size={19}/><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-violet-700">{notice.type === 'TERMS' ? 'Termos e condições' : 'Novidade da plataforma'}</p><h2 className="mt-1 font-bold">{notice.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{notice.body}</p><button type="button" disabled={busyId === notice.id} onClick={() => void acknowledge(notice.id)} className="mt-3 min-h-10 rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50">{notice.type === 'TERMS' ? 'Li e aceito' : 'Entendi'}</button></div></div>
    </article>)}
  </aside>;
}
