export type JobStatus = 'OPEN' | 'CLOSED' | 'DRAFT';

export type ApplicationStatus =
  | 'APPLIED'
  | 'SCREENING'
  | 'REVIEWING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED';

export interface Job {
  id: string;
  companyId: string;
  title: string;
  description: string;
  location?: string | null;
  employmentType?: string | null;
  salaryRange?: string | null;
  benefits?: string[];
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  applicationsCount?: number;
  _count?: {
    applications?: number;
  };
  company?: {
    id: string;
    name: string;
    slug?: string | null;
  };
}

export interface JobPayload {
  title: string;
  description: string;
  location?: string;
  employmentType?: string;
  salaryRange?: string;
  benefits: string[];
  status: JobStatus;
}

export interface Candidate {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  coverLetter?: string | null;
  resumeUrl?: string | null;
  resumeAvailable?: boolean;
  resumeDownloadPath?: string | null;
  aiScore?: number | null;
  aiSummary?: string | null;
  aiNotes?: string | null;
  aiSkills?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface JobApplication {
  id: string;
  companyId: string;
  candidateId: string;
  jobId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  candidate: Candidate;
}

export interface HireResult {
  employeeId?: string;
  employee?: {
    id: string;
    name?: string;
    status?: string;
  };
  application?: JobApplication;
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  OPEN: 'Aberta',
  CLOSED: 'Fechada',
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

export function getApplicationCount(job: Job) {
  return job.applicationsCount ?? job._count?.applications ?? 0;
}

export function normalizeApplicationStatus(status: ApplicationStatus): Exclude<ApplicationStatus, 'REVIEWING'> {
  return status === 'REVIEWING' ? 'SCREENING' : status;
}
