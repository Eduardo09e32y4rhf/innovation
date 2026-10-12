'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCandidateStatus, type CandidateStatus } from '../../_lib/public-jobs';

const date = (value: string) => new Date(value).toLocaleDateString('pt-BR');

/** Portal do candidato: o link secreto recebido por e-mail mostra em que etapa está a candidatura, sem login. */
export function StatusClient({ token }: { token: string }) {
  const [data, setData] = useState<CandidateStatus | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getCandidateStatus(token).then(setData).catch(() => setError('Não encontramos esta candidatura. Confira o link do e-mail ou o prazo de guarda dos dados.')); }, [token]);

  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-5 px-4 py-10">
      <h1 className="text-2xl font-semibold">Acompanhe sua candidatura</h1>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      {!data && !error && <p role="status">Carregando…</p>}
      {data && (
        <>
          <section className="card-v2 space-y-1 p-5">
            <p className="text-sm text-fg-mut">{data.company}</p>
            <h2 className="text-lg font-semibold">{data.job}</h2>
            <p className="text-sm">Enviada em {date(data.appliedAt)}</p>
            <p className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold ${data.status === 'REJECTED' ? 'bg-slate-100 text-slate-700' : data.status === 'HIRED' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'}`}>{data.statusLabel}{data.stage && data.status !== 'REJECTED' && data.status !== 'HIRED' ? ` · ${data.stage}` : ''}</p>
          </section>
          <section className="card-v2 p-5">
            <h2 className="font-semibold">Histórico</h2>
            <ol className="mt-3 space-y-2 border-l-2 border-border pl-4 text-sm">
              {data.timeline.map((item, index) => <li key={index}><span className="font-medium">{item.label}</span> <span className="text-fg-mut">· {date(item.at)}</span></li>)}
            </ol>
          </section>
          <p className="text-xs text-fg-mut">{data.retentionUntil ? `Seus dados ficam guardados até ${date(data.retentionUntil)}. ` : ''}Para acesso, correção ou exclusão dos dados, <Link className="underline" href="/carreiras/privacidade">peça aqui</Link>.</p>
        </>
      )}
    </main>
  );
}