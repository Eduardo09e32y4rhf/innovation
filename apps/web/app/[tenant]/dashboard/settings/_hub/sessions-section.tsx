'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui';
import { api, type SessionInfo } from '@/app/lib/api';

function label(session: SessionInfo) { return session.userAgent?.split(')')[0]?.split('(').pop() || 'Navegador desconhecido'; }

export function SessionsSection() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { setSessions(await api.auth.sessions()); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as sessões.'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function revoke(id: string) { await api.auth.revokeSession(id); await load(); }
  async function revokeOthers() { await api.auth.revokeOtherSessions(); await load(); }
  return <section className="card-v2 space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-fg">Sessões ativas</h2><p className="text-sm text-fg-sub">Revise onde sua conta está conectada.</p></div><Button variant="secondary" onClick={revokeOthers} disabled={loading || sessions.length < 2}>Encerrar outras sessões</Button></div>{error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}{loading ? <p className="text-sm text-fg-sub">Carregando…</p> : <ul className="divide-y divide-border">{sessions.map((session) => <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium text-fg">{label(session)} {session.current && <span className="ml-1 rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Esta sessão</span>}</p><p className="text-xs text-fg-sub">{session.ip || 'IP não informado'} · {new Date(session.lastUsedAt || session.createdAt).toLocaleString('pt-BR')}</p></div>{!session.current && <Button variant="secondary" onClick={() => void revoke(session.id)}>Encerrar</Button>}</li>)}</ul>}</section>;
}
