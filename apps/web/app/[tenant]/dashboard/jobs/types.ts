export type JobStatus = 'OPEN' | 'CLOSED' | 'DRAFT';
export type StageKind = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
export type QuestionType = 'TEXT' | 'LONG' | 'SELECT' | 'MULTI' | 'YESNO' | 'NUMBER';

export interface Job {
  id: string;
  companyId: string;
  title: string;
  description: string;
  location?: string | null;
  employmentType?: string | null;
  salaryRange?: string | null;
  benefits?: string[];
  requirements?: string[];
  status: JobStatus;
  department?: string | null;
  workMode?: string | null;
  seniority?: string | null;
  openings: number;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryHidden: boolean;
  deadline?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { applications?: number; questions?: number };
  pipeline?: { new: number; inProgress: number; hired: number; rejected: number };
}

export interface JobPayload {
  title: string;
  description: string;
  location?: string;
  employmentType?: string;
  salaryRange?: string;
  benefits?: string[];
  requirements?: string[];
  status?: JobStatus;
  department?: string;
  workMode?: string;
  seniority?: string;
  openings?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryHidden?: boolean;
  deadline?: string | null;
}

export interface Stage {
  id?: string;
  name: string;
  color: string;
  position?: number;
  kind: StageKind;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: (Stage & { id: string })[];
}

export interface KnockoutRule {
  acceptValues?: string[];
  min?: number;
  max?: number;
  action?: 'FLAG' | 'REJECT';
}

export interface ScoreRule {
  points?: Record<string, number>;
  ranges?: { min?: number; max?: number; points: number }[];
}

export interface Question {
  id?: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[];
  knockout?: KnockoutRule | null;
  scoreRule?: ScoreRule | null;
}

export interface Criterion {
  id?: string;
  name: string;
  weight: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface ApplicationAnswer {
  questionId: string;
  label: string;
  type: QuestionType;
  value: string;
  points: number;
  knockedOut: boolean;
}

export interface ApplicationItem {
  id: string;
  jobId: string;
  status: StageKind;
  stageId: string | null;
  stageMovedAt: string;
  createdAt: string;
  source?: string | null;
  score: number | null;
  evaluationScore: number | null;
  favorite: boolean;
  knockedOut: boolean;
  knockoutReason?: string | null;
  rejectionReason?: string | null;
  coverLetter?: string | null;
  linkedinUrl?: string | null;
  resumeAvailable: boolean;
  resumeName?: string | null;
  candidate: { id: string; name: string; email?: string | null; phone?: string | null; admittedEmployeeId?: string | null } | null;
  tags: Tag[];
  answers: ApplicationAnswer[];
}

export interface ApplicationsPayload {
  pipeline: Pipeline;
  questions: (Question & { id: string })[];
  criteria: (Criterion & { id: string })[];
  applications: ApplicationItem[];
}

export interface ApplicationDetail extends ApplicationItem {
  job: { id: string; title: string };
  criteria: (Criterion & { id: string })[];
  evaluations: { id: string; criterionId: string; userId: string; score: number; comment?: string | null }[];
  notes: { id: string; authorName?: string | null; body: string; createdAt: string }[];
  interviews: { id: string; scheduledAt: string; kind: string; location?: string | null; interviewer?: string | null; notes?: string | null }[];
  events: { id: string; type: string; fromStage?: string | null; toStage?: string | null; note?: string | null; createdAt: string }[];
}

export interface ApplicationFilters {
  q?: string;
  stageId?: string;
  tagId?: string;
  favorite?: string;
  minScore?: string;
  minRating?: string;
  knockedOut?: string;
  from?: string;
  to?: string;
  answerQ?: string;
  answerV?: string;
  sort?: string;
}

export interface SavedView {
  id: string;
  name: string;
  filters: ApplicationFilters;
}

export interface Stats {
  jobs: { open: number; draft: number; closed: number };
  applications: {
    total: number;
    last30Days: number;
    waitingReview: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
  };
  totals?: { upcomingInterviews: number; pendingDocuments: number };
  nextInterviews: { id: string; scheduledAt: string; kind: string; applicationId: string; jobId: string; candidateName: string; jobTitle: string }[];
}

export interface HireResult {
  employee?: { id: string; name?: string; status?: string };
  alreadyHired?: boolean;
}

export interface HirePayload {
  department: string;
  contractType: string;
  admissionDate: string;
  salary?: number;
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  OPEN: 'Aberta',
  CLOSED: 'Encerrada',
  DRAFT: 'Rascunho',
};

export const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  CLT: 'CLT',
  PJ: 'Pessoa jurídica',
  ESTAGIO: 'Estágio',
  TEMPORARIO: 'Temporário',
  JOVEM_APRENDIZ: 'Jovem aprendiz',
  INTERNSHIP: 'Estágio',
  FULL_TIME: 'Tempo integral',
  PART_TIME: 'Meio período',
  CONTRACTOR: 'Prestador',
};

export const WORK_MODE_LABEL: Record<string, string> = {
  PRESENCIAL: 'Presencial',
  HIBRIDO: 'Híbrido',
  REMOTO: 'Remoto',
};

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  TEXT: 'Texto curto',
  LONG: 'Texto longo',
  SELECT: 'Escolha única',
  MULTI: 'Múltipla escolha',
  YESNO: 'Sim ou Não',
  NUMBER: 'Número',
};

export const STAGE_KIND_LABEL: Record<StageKind, string> = {
  APPLIED: 'Entrada',
  SCREENING: 'Triagem',
  INTERVIEW: 'Entrevista',
  OFFER: 'Proposta',
  HIRED: 'Contratação',
  REJECTED: 'Reprovação',
};

export const REJECTION_SUGGESTIONS = [
  'Perfil não aderente',
  'Não atende requisito obrigatório',
  'Pretensão salarial fora da faixa',
  'Desistiu do processo',
  'Vaga preenchida',
];

export function salaryLabel(job: Pick<Job, 'salaryMin' | 'salaryMax' | 'salaryRange' | 'salaryHidden'>) {
  if (job.salaryHidden) return 'A combinar';
  const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  if (job.salaryMin && job.salaryMax) return `${money(job.salaryMin)} a ${money(job.salaryMax)}`;
  if (job.salaryMin) return `A partir de ${money(job.salaryMin)}`;
  if (job.salaryMax) return `Até ${money(job.salaryMax)}`;
  return job.salaryRange || 'A combinar';
}

export function daysSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
}
