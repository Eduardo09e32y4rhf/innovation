'use client';

import { RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, PageHeader } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { resolveUserRole } from '@/app/lib/user-role';

const date = (value: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

/** Usuários > Candidatos (só DEV): logins e dados de perfil de quem criou conta no portal de vagas. Sem senha, CPF, telefone nem endereço. */
export default function CandidateAccountsPage() {
  const { user, company, loading } = useAuth();
  const isDev = resolveUserRole(user) === 'DEV';
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { const timer = window.setTimeout(() => { setQ(term.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [term]);
  const result = useQuery(() => api.candidateAccounts.list(q, page), [company?.id, q, page], { enabled: isDev });

  if (loading || !user) return <LoadingState label="Carregando…" />;
  if (!isDev) return <section className="card-v2 m-4 p-5"><h1 className="text-xl font-semibold">Acesso restrito</h1><p className="mt-2 text-sm text-fg-sub">Somente a equipe da plataforma vê os candidatos cadastrados.</p></section>;
  const data = result.data;

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 px-3 py-4 sm:px-6">
      <PageHeader title="Candidatos" subtitle="Quem criou conta no portal de vagas. Mostra login e dados de perfil; senha, CPF, telefone e endereço não aparecem aqui."
        actions={<div className="flex gap-2"><Link href="." className="inline-flex min-h-11 items-center rounded-xl border border-border bg-bg px-4 text-sm font-semibold hover:bg-bg-sub">← Usuários</Link><Button variant="outline" onClick={() => void result.refetch()} aria-label="Atualizar lista"><RefreshCw size={15} aria-hidden="true" /></Button></div>} />
      <label className="card-v2 relative block p-3"><Search size={16} className="absolute left-6 top-6 text-fg-sub" aria-hidden="true" /><input className="input-v2 min-h-11 w-full pl-9" placeholder="Buscar por e-mail, nome, profissão ou cidade" value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Buscar candidatos" /></label>
      {result.error && <ErrorState message={result.error} onRetry={result.refetch} />}
      {result.loading && !data ? <LoadingState label="Carregando candidatos…" /> : data && data.items.length === 0 ? <EmptyState message="Nenhum candidato cadastrado." /> : data && (
        <>
          <p role="status" className="text-sm text-fg-sub">{data.total} candidato(s)</p>
          <ul className="card-v2 divide-y divide-border">
            {data.items.map((item) => (
              <li key={item.id} className="space-y-1 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="min-w-0 break-all text-sm font-semibold">{item.name || 'Sem nome'} <span className="font-normal text-fg-sub">· {item.email}</span></p>
                  <span className="flex flex-wrap gap-1.5 text-xs">
                    {item.talentPool && <span className="rounded-full bg-purple-50 px-2.5 py-0.5 font-medium text-purple-700">Banco de talentos</span>}
                    {item.locked && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800">Bloqueado</span>}
                    {!item.hasPassword && <span className="rounded-full bg-bg-sub px-2.5 py-0.5">Sem senha</span>}
                  </span></div>
                <p className="text-xs text-fg-sub">{item.profession || 'Profissão não informada'} · {[item.city, item.state].filter(Boolean).join('/') || 'Cidade não informada'} · {item.highestEducation || 'Escolaridade não informada'} · {item.hasDriverLicense ? `CNH ${item.driverLicenseCategory ?? ''}` : item.hasDriverLicense === false ? 'Sem CNH' : 'CNH não informada'} · {item.hasResume ? 'Com currículo' : 'Sem currículo'}</p>
                <p className="text-xs text-fg-sub">{item.applications} candidatura(s) · criado em {date(item.createdAt)} · último acesso {date(item.lastLoginAt)}</p>
              </li>
            ))}
          </ul>
          {data.total > data.pageSize && <nav aria-label="Paginação" className="flex items-center justify-between text-sm text-fg-sub"><span>Página {page} de {Math.ceil(data.total / data.pageSize)}</span><span className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Próxima</Button></span></nav>}
        </>
      )}
    </div>
  );
}
