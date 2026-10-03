'use client';

import { Download, Mail, Phone, Linkedin } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Drawer } from '@/app/components/ui/drawer';
import { normalizeApplicationStatus, type ApplicationStatus, type Job, type JobApplication } from './types';

interface CandidateDrawerProps {
  application: JobApplication | null; job: Job; updating: boolean; hiring: boolean; downloadingResume: boolean;
  onClose: () => void; onStatusChange: (status: ApplicationStatus) => Promise<void>; onHire: () => Promise<void>; onDownloadResume: () => Promise<void>;
}
const OPTIONS = [
  ['APPLIED', 'Inscrito'], ['SCREENING', 'Em análise'], ['INTERVIEW', 'Entrevista'],
  ['OFFER', 'Proposta'], ['HIRED', 'Contratado'], ['REJECTED', 'Reprovado'],
];
function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleString('pt-BR');
}
function safeExternalUrl(value?: string | null) {
  try { const url = new URL(value || ''); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}
export function CandidateDrawer(props: CandidateDrawerProps) {
  const { application, job, updating, hiring, downloadingResume, onClose, onStatusChange, onHire, onDownloadResume } = props;
  const candidate = application?.candidate;
  const status = application ? normalizeApplicationStatus(application.status) : 'APPLIED';
  const blocked = updating || hiring;
  const linkedin = safeExternalUrl(candidate?.linkedinUrl);
  return <Drawer isOpen={Boolean(application)} onClose={() => { if (!blocked && !downloadingResume) onClose(); }}
    title={candidate?.name} description={job.title} maxWidth="max-w-xl"
    footer={status !== 'HIRED'
      ? <Button type="button" className="w-full" disabled={blocked} onClick={() => void onHire()}>Contratar e iniciar admissão</Button>
      : <p role="status" className="text-sm text-emerald-800">Admissão iniciada. Confira o cadastro do funcionário.</p>}>
    {candidate && application && <div className="space-y-5 text-sm">
      <section className="card-v2 space-y-2 p-4"><label className="block space-y-2"><span className="font-medium">Etapa atual</span>
        <select className="input-v2 min-h-11 text-base sm:text-sm" value={status} disabled={blocked || status === 'HIRED'} onChange={event => void onStatusChange(event.target.value as ApplicationStatus)}>
          {OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label><p className="text-xs text-fg-mut" role="status">{blocked ? 'Salvando...' : status === 'HIRED' ? 'Funcionário vinculado à admissão.' : 'Escolher Contratado abre a confirmação de admissão.'}</p></section>
      <section className="card-v2 space-y-2 p-4"><h3 className="font-semibold">Contato</h3>
        {candidate.email ? <a className="flex min-h-11 items-center gap-2 break-all underline" href={'mailto:' + candidate.email}><Mail size={18} aria-hidden />{candidate.email}</a> : <p>E-mail não informado</p>}
        {candidate.phone ? <a className="flex min-h-11 items-center gap-2 underline" href={'tel:' + candidate.phone.replace(/[^+\d]/g, '')}><Phone size={18} aria-hidden />{candidate.phone}</a> : <p>Telefone não informado</p>}
        {linkedin ? <a className="flex min-h-11 items-center gap-2 underline" href={linkedin} target="_blank" rel="noopener noreferrer"><Linkedin size={18} aria-hidden />Perfil no LinkedIn</a> : <p>LinkedIn não informado ou endereço indisponível</p>}
      </section>
      <section className="card-v2 space-y-3 p-4"><h3 className="font-semibold">Candidatura</h3><dl className="space-y-2">
        <div><dt className="text-fg-mut">Recebida em</dt><dd>{dateTime(application.createdAt)}</dd></div>
        <div><dt className="text-fg-mut">Última movimentação</dt><dd>{dateTime(application.updatedAt)}</dd></div>
      </dl></section>
      <section className="card-v2 space-y-3 p-4"><h3 className="font-semibold">Análise automática</h3>
        <p className="text-xs text-fg-mut">Informações retornadas pelo sistema; a avaliação do RH continua necessária.</p>
        <p>{candidate.aiScore == null ? 'Análise indisponível' : 'Indicador: ' + candidate.aiScore + '%'}</p>
        {candidate.aiSummary && <p className="whitespace-pre-wrap break-words">{candidate.aiSummary}</p>}
        {!!candidate.aiSkills?.length && <ul className="flex flex-wrap gap-2">{candidate.aiSkills.map(skill => <li key={skill} className="rounded-lg bg-bg-sub px-2 py-1">{skill}</li>)}</ul>}
        {candidate.aiNotes && <div className="rounded-lg bg-amber-50 p-3"><h4 className="font-medium">Pontos de atenção</h4><p className="mt-1 whitespace-pre-wrap break-words">{candidate.aiNotes}</p></div>}
      </section>
      <section className="card-v2 space-y-3 p-4"><h3 className="font-semibold">Currículo</h3>
        {candidate.resumeAvailable || candidate.resumeUrl
          ? <Button type="button" variant="outline" onClick={() => void onDownloadResume()} isLoading={downloadingResume}><Download size={18} aria-hidden />Baixar currículo</Button>
          : <p className="text-fg-mut">Currículo não disponível.</p>}
      </section>
      {candidate.coverLetter && <section className="card-v2 space-y-2 p-4"><h3 className="font-semibold">Apresentação</h3><p className="whitespace-pre-wrap break-words">{candidate.coverLetter}</p></section>}
      <p className="text-sm text-fg-mut">Ao confirmar a contratação, os dados disponíveis serão reaproveitados na admissão para conferência do RH.</p>
    </div>}
  </Drawer>;
}
