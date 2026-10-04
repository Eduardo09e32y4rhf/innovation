'use client';

import { Download, LogIn, MousePointerClick, PencilLine, ShieldAlert, UserCog } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { api, type ActivityItem, type UserActivity } from '@/app/lib/api';
import { dateTime } from './policy';

const TYPE_META: Record<ActivityItem['type'], { label: string; icon: typeof LogIn; tone: string }> = {
  PAGE: { label: 'Página', icon: MousePointerClick, tone: 'bg-sky-50 text-sky-700' },
  LOGIN: { label: 'Login', icon: LogIn, tone: 'bg-emerald-50 text-emerald-700' },
  CHANGE: { label: 'Alteração', icon: PencilLine, tone: 'bg-purple-50 text-purple-700' },
  SECURITY: { label: 'Segurança', icon: ShieldAlert, tone: 'bg-rose-50 text-rose-700' },
  ACCESS: { label: 'Acesso', icon: UserCog, tone: 'bg-amber-50 text-amber-800' },
};
const FILTERS: { id: 'ALL' | ActivityItem['type']; label: string }[] = [
  { id: 'ALL', label: 'Tudo' }, { id: 'PAGE', label: 'Páginas' }, { id: 'CHANGE', label: 'Alterações' }, { id: 'LOGIN', label: 'Logins' }, { id: 'SECURITY', label: 'Segurança' }, { id: 'ACCESS', label: 'Acesso' },
];
const POLL_MS = 5000;

/** Histórico completo do usuário, atualizado sozinho a cada 5 s (enquanto a aba está visível). */
export function ActivityPanel({ userId }: { userId: string }) {
  const [data, setData] = useState<UserActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('ALL');
  const [live, setLive] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const latest = useRef<string | null>(null);

  const load = useCallback(async (full: boolean) => {
    try {
      const result = await api.users.activity(userId, full || !latest.current ? { days: 30, limit: 300 } : { days: 30, limit: 100, since: latest.current });
      setError(null);
      setData((previous) => {
        if (full || !previous) return result;
        const known = new Set(previous.items.map((item) => item.id));
        const fresh = result.items.filter((item) => !known.has(item.id));
        return fresh.length ? { ...previous, items: [...fresh, ...previous.items].slice(0, 1000), total: previous.total + fresh.length } : previous;
      });
      if (result.items[0]) latest.current = result.items[0].at;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico.'); }
  }, [userId]);

  useEffect(() => { latest.current = null; setData(null); void load(true); }, [load]);
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(false); }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [live, load]);

  const items = useMemo(() => (data?.items ?? []).filter((item) => filter === 'ALL' || item.type === filter), [data, filter]);

  async function pdf() {
    setDownloading(true);
    try { await api.users.activityPdf(userId, 30); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Não foi possível gerar o PDF.'); }
    finally { setDownloading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setLive((v) => !v)} aria-pressed={live} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium">
          <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-emerald-500' : 'bg-zinc-400'}`} aria-hidden="true" />{live ? 'Ao vivo' : 'Pausado'}
        </button>
        <Button variant="outline" size="sm" isLoading={downloading} onClick={pdf}><Download size={14} aria-hidden="true" /> PDF dos últimos 30 dias</Button>
      </div>

      {data && (
        <p className="rounded-lg bg-bg-sub px-3 py-2 text-xs text-fg-sub">
          <strong className="text-fg">{data.user.name}</strong> · {data.user.email} · Matrícula: {data.user.registration ?? 'não vinculada'} · {data.total} registro(s) nos últimos {data.days} dias
        </p>
      )}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar histórico">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === item.id ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-border text-fg-sub hover:bg-bg-sub'}`}>{item.label}</button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {!data && !error && <p role="status" className="py-6 text-center text-sm text-fg-sub">Carregando histórico…</p>}
      {data && items.length === 0 && <p className="py-6 text-center text-sm text-fg-sub">Nenhum registro neste filtro.</p>}

      <ol className="space-y-2">
        {items.map((item) => {
          const meta = TYPE_META[item.type];
          const Icon = meta.icon;
          return (
            <li key={item.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}><Icon size={15} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{item.title}{item.target && <span className="ml-1 break-all font-mono text-xs font-normal text-fg-sub">{item.target}</span>}</p>
                  <p className="text-xs text-fg-sub">{dateTime(item.at)} · IP {item.ip ?? 'não registrado'}{item.by ? ` · por ${item.by}` : ''}</p>
                  {item.changes.length > 0 && (
                    <ul className="mt-2 space-y-1 rounded-lg bg-bg-sub p-2 text-xs">
                      {item.changes.map((change, index) => (
                        <li key={index}><span className="font-medium">{change.field}:</span>{' '}
                          {change.from !== null && <span className="rounded bg-rose-50 px-1 text-rose-700 line-through">{change.from}</span>}
                          {change.from !== null && change.to !== null && ' → '}
                          {change.to !== null && <span className="rounded bg-emerald-50 px-1 text-emerald-700">{change.to}</span>}
                          {change.from === null && change.to === null && <span className="text-fg-sub">(vazio)</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {data?.truncated && <p className="text-center text-xs text-fg-sub">Mostrando os registros mais recentes. O PDF traz até 2.000.</p>}
    </div>
  );
}
