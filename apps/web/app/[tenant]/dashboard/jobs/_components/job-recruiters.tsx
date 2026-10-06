'use client';

import { UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { jobsApi } from '../jobs-api';

const ROLE_LABEL: Record<string, string> = { RH: 'RH — Empresas', RH_RS: 'RH — R&S' };

/**
 * Responsaveis pela vaga. Com responsaveis, so eles (e RH/ADMIN/DEV) enxergam a vaga e as candidaturas;
 * sem responsaveis, toda a equipe de R&S da empresa enxerga. Quem recruta nao define o proprio escopo.
 */
export function JobRecruiters({ jobId }: { jobId: string }) {
  const current = useQuery(() => jobsApi.recruiters(jobId), [jobId]);
  const eligible = useQuery(() => jobsApi.eligibleRecruiters(), []);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (current.data) setSelected(new Set(current.data.map((row) => row.userId))); }, [current.data]);

  if ((current.loading && !current.data) || (eligible.loading && !eligible.data)) return <LoadingState label="Carregando responsáveis…" />;
  if (current.error || eligible.error) return <ErrorState message={current.error ?? eligible.error ?? 'Erro ao carregar.'} onRetry={() => { current.refetch(); eligible.refetch(); }} />;

  const savedIds = new Set((current.data ?? []).map((row) => row.userId));
  const dirty = selected.size !== savedIds.size || [...selected].some((id) => !savedIds.has(id));

  async function save() {
    setBusy(true);
    try { await jobsApi.assignRecruiters(jobId, [...selected]); toast.success('Responsáveis atualizados.'); current.refetch(); }
    catch (cause) { toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível salvar os responsáveis.'); }
    finally { setBusy(false); }
  }

  return (
    <details className="rounded-xl border border-border p-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium"><UsersRound size={16} aria-hidden="true" /> Responsáveis pela vaga ({savedIds.size === 0 ? 'toda a equipe de R&S' : savedIds.size})</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-fg-sub">Com responsáveis marcados, só eles (além de ADMIN e RH) veem esta vaga e suas candidaturas. Sem ninguém marcado, toda a equipe de R&S da empresa vê.</p>
        {(eligible.data ?? []).length === 0 ? <p className="text-sm text-fg-sub">Não há usuários de RH ou R&S ativos. Crie acessos em Usuários.</p> : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {(eligible.data ?? []).map((person) => (
              <li key={person.id}>
                <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm">
                  <input type="checkbox" className="h-4 w-4" checked={selected.has(person.id)}
                    onChange={() => setSelected((previous) => { const next = new Set(previous); if (next.has(person.id)) next.delete(person.id); else next.add(person.id); return next; })} />
                  <span className="min-w-0 break-words">{person.name} <span className="text-xs text-fg-sub">· {ROLE_LABEL[person.role] ?? person.role}</span></span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Button isLoading={busy} disabled={!dirty} onClick={save}>Salvar responsáveis</Button>
          <Button variant="ghost" disabled={!dirty || busy} onClick={() => setSelected(new Set(savedIds))}>Desfazer</Button>
        </div>
      </div>
    </details>
  );
}