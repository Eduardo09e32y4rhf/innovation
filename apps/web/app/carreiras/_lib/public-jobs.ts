export const CAREERS_API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
export const MAX_RESUME_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_RESUME_EXTENSIONS = ['pdf', 'docx'] as const;

export type PublicCompany = {
  id: string;
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  description?: string | null;
  city?: string | null;
  state?: string | null;
};

export type PublicJob = {
  id: string;
  companyId: string;
  title: string;
  description: string;
  location?: string | null;
  employmentType?: string | null;
  salaryRange?: string | null;
  benefits: string[];
  status: 'OPEN' | 'CLOSED' | string;
  department?: string | null;
  workMode?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  company?: PublicCompany | null;
};

export type PublicJobsResult = {
  company: PublicCompany;
  jobs: PublicJob[];
};

export type JobApplicationInput = {
  name: string;
  email: string;
  phone: string;
  linkedinUrl?: string;
  coverLetter?: string;
  website?: string;
  resume: File;
};

export class CareersApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'CareersApiError';
    this.status = status;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unwrap(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return value;
  if ('success' in record && 'data' in record) return unwrap(record.data);
  return value;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeCompany(value: unknown, fallbackId: string): PublicCompany {
  const record = asRecord(value) ?? {};
  const name =
    optionalString(record.name) ??
    optionalString(record.tradeName) ??
    optionalString(record.legalName) ??
    'Empresa';

  return {
    id: optionalString(record.id) ?? fallbackId,
    name,
    slug: optionalString(record.slug),
    logoUrl: optionalString(record.logoUrl),
    primaryColor: optionalString(record.primaryColor),
    description: optionalString(record.description),
    city: optionalString(record.city),
    state: optionalString(record.state),
  };
}

function normalizeBenefits(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeJob(value: unknown, fallbackCompanyId: string): PublicJob | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = optionalString(record.id);
  const title = optionalString(record.title);
  if (!id || !title) return null;

  const companyRecord = asRecord(record.company);
  const companyId =
    optionalString(record.companyId) ??
    optionalString(companyRecord?.id) ??
    fallbackCompanyId;

  return {
    id,
    companyId,
    title,
    description: optionalString(record.description) ?? '',
    location: optionalString(record.location),
    employmentType: optionalString(record.employmentType),
    salaryRange: optionalString(record.salaryRange),
    benefits: normalizeBenefits(record.benefits),
    status: optionalString(record.status) ?? 'OPEN',
    department: optionalString(record.department),
    workMode: optionalString(record.workMode),
    createdAt: optionalString(record.createdAt),
    updatedAt: optionalString(record.updatedAt),
    company: companyRecord ? normalizeCompany(companyRecord, companyId) : null,
  };
}

async function fetchPublic(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(`${CAREERS_API_URL}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new CareersApiError(
      0,
      'Não foi possível conectar ao portal de vagas. Verifique sua conexão e tente novamente.',
    );
  }

  const raw = await response.text();
  let body: unknown = null;

  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw;
    }
  }

  if (!response.ok) {
    const record = asRecord(body);
    const nestedError = asRecord(record?.error);
    const rawMessage = nestedError?.message ?? record?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : optionalString(rawMessage);

    throw new CareersApiError(
      response.status,
      message ??
        (response.status === 404
          ? 'A vaga ou empresa informada não foi encontrada.'
          : 'Não foi possível concluir a solicitação. Tente novamente.'),
    );
  }

  return unwrap(body);
}

export type GlobalCareersResult = {
  companies: PublicCompany[];
  jobs: PublicJob[];
};

export async function getPublicJobs(companyId: string): Promise<PublicJobsResult> {
  const payload = await fetchPublic(`/public/jobs/company/${encodeURIComponent(companyId)}`);
  const record = asRecord(payload);
  const rawJobs = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.jobs)
      ? record.jobs
      : Array.isArray(record?.items)
        ? record.items
        : [];

  const jobs = rawJobs
    .map((job) => normalizeJob(job, companyId))
    .filter((job): job is PublicJob => Boolean(job))
    .filter((job) => job.status === 'OPEN');

  const companySource =
    record?.company ??
    jobs.find((job) => job.company)?.company ??
    { id: companyId, name: 'Carreiras' };

  return {
    company: normalizeCompany(companySource, companyId),
    jobs,
  };
}

export async function getPublicJobsCatalog(): Promise<{ jobs: PublicJob[] }> {
  const payload = await fetchPublic('/public/jobs');
  const record = asRecord(payload);
  const rawJobs = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.jobs)
      ? record.jobs
      : Array.isArray(record?.items)
        ? record.items
        : [];

  return {
    jobs: rawJobs
      .map((job) => normalizeJob(job, optionalString(asRecord(job)?.companyId) ?? 'catalog'))
      .filter((job): job is PublicJob => Boolean(job))
      .filter((job) => job.status === 'OPEN'),
  };
}

export async function getAllPublicJobs(): Promise<{ companies: PublicCompany[]; jobs: PublicJob[] }> {
  const payload = await fetchPublic('/public/jobs');
  const record = asRecord(payload);
  const rawJobs = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.jobs)
      ? record.jobs
      : Array.isArray(record?.items)
        ? record.items
        : [];

  const jobs = rawJobs
    .map((job) => normalizeJob(job, optionalString(asRecord(job)?.companyId) ?? 'catalog'))
    .filter((job): job is PublicJob => Boolean(job))
    .filter((job) => job.status === 'OPEN');

  const companies = Array.from(
    new Map(
      jobs
        .map((job) => job.company)
        .filter((company): company is PublicCompany => Boolean(company))
        .map((company) => [company.id, company] as const),
    ).values(),
  );

  return { companies, jobs };
}

export async function getPublicJob(companyId: string, jobId: string): Promise<PublicJob> {
  const payload = await fetchPublic(`/public/jobs/${encodeURIComponent(jobId)}`);
  const record = asRecord(payload);
  const job = normalizeJob(record?.job ?? payload, companyId);

  if (!job || job.status !== 'OPEN') {
    throw new CareersApiError(404, 'Esta vaga não está disponível para candidaturas.');
  }

  return job;
}

export async function applyToPublicJob(
  jobId: string,
  input: JobApplicationInput,
): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append('name', input.name.trim());
  formData.append('email', input.email.trim().toLowerCase());
  formData.append('phone', input.phone.replace(/\D/g, ''));
  if (input.linkedinUrl?.trim()) {
    formData.append('linkedinUrl', input.linkedinUrl.trim());
  }
  if (input.coverLetter?.trim()) {
    formData.append('coverLetter', input.coverLetter.trim());
  }
  if (input.website?.trim()) {
    formData.append('website', input.website.trim());
  }
  formData.append('resume', input.resume, input.resume.name);

  const payload = await fetchPublic(`/public/jobs/${encodeURIComponent(jobId)}/apply`, {
    method: 'POST',
    body: formData,
  });
  const record = asRecord(payload);

  return {
    message:
      optionalString(record?.message) ??
      'Candidatura enviada com sucesso. Boa sorte no processo seletivo!',
  };
}

export function validateResume(file: File | null): string | null {
  if (!file) return 'Selecione seu currículo em PDF ou DOCX.';

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ACCEPTED_RESUME_EXTENSIONS.includes(extension as 'pdf' | 'docx')) {
    return 'Formato inválido. Envie um arquivo PDF ou DOCX.';
  }

  if (file.size > MAX_RESUME_SIZE) {
    return 'O currículo deve ter no máximo 5 MB.';
  }

  const acceptedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (file.type && !acceptedMimeTypes.includes(file.type)) {
    return 'O conteúdo do arquivo não corresponde a um PDF ou DOCX válido.';
  }

  return null;
}

export function companyInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function safeAccentColor(color?: string | null): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : '#0f766e';
}

export function employmentTypeLabel(type?: string | null): string {
  const labels: Record<string, string> = {
    CLT: 'CLT',
    PJ: 'Pessoa jurídica',
    INTERNSHIP: 'Estágio',
    ESTAGIO: 'Estágio',
    TEMPORARY: 'Temporário',
    TEMPORARIO: 'Temporário',
    APPRENTICE: 'Jovem aprendiz',
    JOVEM_APRENDIZ: 'Jovem aprendiz',
    FULL_TIME: 'Tempo integral',
    PART_TIME: 'Meio período',
  };

  if (!type) return 'A combinar';
  return labels[type.toUpperCase()] ?? type.replaceAll('_', ' ');
}
