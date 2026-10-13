'use client';

import { Download, MapPin, Search, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, Modal, PageHeader } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { jobsApi, type TalentCard, type TalentFilters } from '../jobs-api';

const ALLOWED = new Set(['DEV', 'ADMIN', 'RH']);
const LEVELS = ['Ensino fundamental', 'Ensino médio', 'Técnico', 'Superior', 'Pós-graduação'];
const CATEGORIES = ['A', 'B', 'AB', 'C', 'D', 'E', 'AC', 'AD', 'AE'];
const message = (cause: unknown) => (cause instanceof ApiError ? cause.message : 'Não foi possível concluir a ação.');

export default function TalentPoolPage() {
  return <Suspense fallback={<LoadingState label="Carregando…" />}><TalentPool /></Suspense>;
}

function TalentPool() {
  const { tenant = '' } = useParams<{ tenant: string }>();
  const search = useSearchParams();
  const { user, company } = useAuth();
  const role = (user?.profile ?? user?.role ?? '').toUpperCase();
  const allowed = ALLOWED.has(role);
  const [filters, setFilters] = useState<TalentFilters>({});
  const [applied, setApplied] = useState<TalentFilters>({});
  const [page, setPage] = useState(1);
  const result = useQuery(() => jobsApi.talentSearch({ ...applied, page }), [company?.id, JSON.stringify(applied), page], { enabled: allowed });
  const jobs = useQuery(() => jobsApi.list(), [company?.id], { enabled: allowed });
  const openJobs = (jobs.data ?? []).filter((job) => job.status === 'OPEN' && !(job as { isInternal?: boolean }).isInternal);
  const [target, setTarget] = useState<TalentCard | null>(null);
  const [jobId, setJobId] = useState(search.get('vaga') ?? '');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const base = `/${tenant}/dashboard/jobs`;

  useEffect(() => { setPage(1); }, [applied]);
  const set = (key: keyof TalentFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const input = 'input-v2 min-h-11 text-base sm:text-sm';

  async function invite() {
    if (!target || !jobId || sending) return;
    setSending(true);
    try {
      const sent = await jobsApi.talentInvite(target.id, { jobId, message: note.trim() || undefined });
      toast.success(sent.emailSent ? 'Convite enviado.' : 'Convite registrado, mas o e-mail não saiu. O candidato verá na Área do candidato.');
      setTarget(null); setNote(''); void result.refetch();
    } catch (cause) { toast.error(message(cause)); } finally { setSending(false); }
  }

  if (!allowed) return <section className="card-v2 m-4 p-5"><h1 className="text-xl font-semibold">Acesso restrito</h1><p className="mt-2 text-sm text-fg-sub">Seu perfil não acessa o banco de talentos.</p></section>;
  const data = result.data;

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 px-3 py-4 sm:px-6">
      <PageHeader title="Banco de talentos" subtitle="Candidatos que aceitaram aparecer para empresas parceiras, mesmo sem ter se inscrito nas suas vagas. Contato só por convite pela plataforma."
        actions={<Link href={base} className="inline-flex min-h-11 items-center rounded-xl border border-border bg-bg px-4 text-sm font-semibold hover:bg-bg-sub">← Vagas</Link>} />

      <form className="card-v2 grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4" onSubmit={(event) => { event.preventDefault(); setApplied({ ...filters }); }} role="search" aria-label="Buscar talentos">
        <label className="relative sm:col-span-2"><Search size={16} className="absolute left-3 top-3.5 text-fg-sub" aria-hidden="true" /><input className={`${input} w-full pl-9`} placeholder="Profissão, conhecimento, curso ou nome" value={filters.q ?? ''} onChange={(e) => set('q', e.target.value)} aria-label="Profissão, conhecimento, curso ou nome" /></label>
        <input className={input} placeholder="Cidade" value={filters.city ?? ''} onChange={(e) => set('city', e.target.value)} aria-label="Cidade" />
        <input className={input} placeholder="UF" maxLength={2} value={filters.state ?? ''} onChange={(e) => set('state', e.target.value.toUpperCase())} aria-label="UF" />
        <select className={input} value={filters.education ?? ''} onChange={(e) => set('education', e.target.value)} aria-label="Escolaridade"><option value="">Qualquer escolaridade</option>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select>
        <select className={input} value={filters.license ?? ''} onChange={(e) => set('license', e.target.value)} aria-label="Habilitação"><option value="">CNH: indiferente</option><option value="sim">Com CNH</option><option value="nao">Sem CNH</option></select>
        <select className={input} value={filters.category ?? ''} onChange={(e) => set('category', e.target.value)} aria-label="Categoria da CNH"><option value="">Qualquer categoria</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
        <div className="flex gap-2"><Button type="submit" className="flex-1"><Search size={15} aria-hidden="true" /> Buscar</Button><Button type="button" variant="outline" onClick={() => { setFilters({}); setApplied({}); }}>Limpar</Button></div>
      </form>

      {result.error && <ErrorState message={result.error} onRetry={result.refetch} />}
      {result.loading && !data ? <LoadingState label="Buscando talentos…" /> : data && data.items.length === 0 ? <EmptyState message="Nenhum talento encontrado com esses filtros." /> : data && (
        <>
          <p role="status" className="text-sm text-fg-sub">{data.total} talento(s){data.truncated ? ' · mostrando os mais recentes, refine a busca' : ''}</p>
          <ul className="space-y-3">
            {data.items.map((talent) => {
              const invitedJobs = talent.invites.map((item) => item.jobId);
              return (
                <li key={talent.id} className="card-v2 space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-base font-semibold">{talent.name}{talent.age ? <span className="ml-2 text-sm font-normal text-fg-sub">{talent.age} anos</span> : null}</h2>
                      <p className="text-sm text-fg-sub">{talent.profession || 'Profissão não informada'}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-fg-sub"><span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{[talent.neighborhood, talent.city, talent.state].filter(Boolean).join(' · ') || 'Local não informado'}</span>{talent.highestEducation && <span>{talent.highestEducation}</span>}{talent.hasDriverLicense && <span>CNH {talent.driverLicenseCategory ?? ''}</span>}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {talent.hasResume && <Button variant="outline" size="sm" onClick={() => void jobsApi.downloadTalentResume(talent.id, `${talent.name}.pdf`).catch((cause) => toast.error(message(cause)))}><Download size={14} aria-hidden="true" /> Currículo</Button>}
                      <Button size="sm" onClick={() => { setTarget(talent); setNote(''); }}><Send size={14} aria-hidden="true" /> Convidar</Button>
                    </div>
                  </div>
                  {talent.skills.length > 0 && <ul className="flex flex-wrap gap-1.5">{talent.skills.map((skill) => <li key={skill} className="rounded-full bg-bg-sub px-2.5 py-1 text-xs">{skill}</li>)}</ul>}
                  {(talent.alreadyApplied || invitedJobs.length > 0) && <p className="text-xs text-fg-sub">{talent.alreadyApplied ? 'Já se candidatou à sua empresa. ' : ''}{invitedJobs.length ? `Convidado para ${invitedJobs.length} vaga(s).` : ''}</p>}
                </li>
              );
            })}
          </ul>
          {data.total > data.pageSize && (
            <nav aria-label="Paginação" className="flex items-center justify-between text-sm text-fg-sub"><span>Página {page} de {Math.ceil(data.total / data.pageSize)}</span>
              <span className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Próxima</Button></span></nav>
          )}
        </>
      )}

      <Modal isOpen={Boolean(target)} onClose={() => setTarget(null)} title={target ? `Convidar ${target.name}` : 'Convidar'}>
        <div className="space-y-4">
          <p className="text-sm text-fg-sub">O convite sai por e-mail pela plataforma. O contato do candidato não é mostrado e ele decide se quer se candidatar.</p>
          <label className="block space-y-1"><span className="text-sm font-medium">Vaga *</span>
            <select className={input} value={jobId} onChange={(e) => setJobId(e.target.value)}><option value="">Selecione uma vaga aberta</option>{openJobs.map((job) => <option key={job.id} value={job.id} disabled={target?.invites.some((item) => item.jobId === job.id)}>{job.title}{target?.invites.some((item) => item.jobId === job.id) ? ' (já convidado)' : ''}</option>)}</select></label>
          <label className="block space-y-1"><span className="text-sm font-medium">Mensagem (opcional)</span><textarea className="input-v2 resize-y text-base sm:text-sm" rows={3} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setTarget(null)}>Cancelar</Button><Button onClick={() => void invite()} disabled={!jobId || sending} isLoading={sending}>Enviar convite</Button></div>
        </div>
      </Modal>
    </div>
  );
}
