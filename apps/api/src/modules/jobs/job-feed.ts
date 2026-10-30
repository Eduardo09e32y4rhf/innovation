/**
 * Feed de vagas abertas por empresa para portais (RS-R-06).
 *  - XML no formato do Indeed "Job Sync XML feed" (raiz <source>, um <job> por vaga; descricao sem HTML; sem entidades HTML).
 *    Fonte: https://docs.indeed.com/job-sync-xml/xml-feed  -> VIA BUSCA (os campos title, date, referencenumber, url, company, city,
 *    state, country, description, salary, jobtype e a regra "so vagas atuais, sem entidades HTML" vieram do resultado da busca; os
 *    elementos <publisher>/<publisherurl>/<lastBuildDate> seguem o formato classico e NAO foram confirmados na pagina atual).
 *  - JSON com os campos do schema.org/JobPosting (Google for Jobs: https://developers.google.com/search/docs/appearance/structured-data/job-posting,
 *    site bloqueado no ambiente -> NAO VERIFICADO diretamente; propriedades usadas: title, description, datePosted, validThrough,
 *    employmentType, hiringOrganization, jobLocation, jobLocationType, baseSalary, directApply).
 * Jooble aceita o mesmo formato XML (cadastro do feed pela propria Jooble: depende do usuario).
 */
export interface FeedJob {
  id: string; title: string; description: string; location: string | null; employmentType: string | null; workMode: string | null;
  salaryMin: number | null; salaryMax: number | null; salaryHidden: boolean; salaryRange: string | null; department: string | null; seniority: string | null;
  openings: number; pcd?: boolean; createdAt: Date | string; deadline: Date | string | null; requirements: string[]; benefits: string[];
}
export interface FeedCompany { id: string; name: string; slug?: string | null }

const JOBTYPE: Record<string, string> = { CLT: 'fulltime', PJ: 'contract', ESTAGIO: 'internship', TEMPORARIO: 'temporary', PART_TIME: 'parttime', JOVEM_APRENDIZ: 'internship' };
const SCHEMA_TYPE: Record<string, string> = { CLT: 'FULL_TIME', PJ: 'CONTRACTOR', ESTAGIO: 'INTERN', TEMPORARIO: 'TEMPORARY', PART_TIME: 'PART_TIME', JOVEM_APRENDIZ: 'INTERN' };
const BRL = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/[\u00a0\u202f]/g, ' ');

/** Remove tags HTML e normaliza espacos; o Indeed nao aceita entidades HTML. */
export function plainText(html: string): string {
  return String(html ?? '').replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(p|li|div|h\d)>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function splitLocation(location: string | null | undefined): { city: string; state: string } {
  const text = String(location ?? '').trim();
  if (!text) return { city: '', state: '' };
  const match = text.match(/^(.*?)\s*[,\-/–]\s*([A-Za-z]{2})$/);
  return match && match[1] ? { city: match[1].trim(), state: match[2].toUpperCase() } : { city: text, state: '' };
}

const xmlText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cdata = (value: string) => `<![CDATA[${value.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
const isRemote = (job: FeedJob) => ['REMOTO', 'REMOTE'].includes(String(job.workMode ?? '').toUpperCase());
const iso = (value: Date | string | null) => (value ? new Date(value).toISOString() : null);

export const companyBase = (company: FeedCompany, appBase: string) => `${appBase}/carreiras/${encodeURIComponent(company.slug || company.id)}`;
export const jobUrl = (company: FeedCompany, job: FeedJob, appBase: string, src?: string) => `${companyBase(company, appBase)}/${encodeURIComponent(job.id)}${src ? `?src=${src}` : ''}`;

export function salaryText(job: FeedJob): string {
  if (job.salaryHidden) return '';
  if (job.salaryMin && job.salaryMax) return `${BRL(job.salaryMin)} - ${BRL(job.salaryMax)} por mês`;
  if (job.salaryMin || job.salaryMax) return `${BRL((job.salaryMin ?? job.salaryMax) as number)} por mês`;
  return job.salaryRange ?? '';
}

function fullDescription(job: FeedJob): string {
  return [plainText(job.description), job.requirements.length ? `Requisitos: ${job.requirements.join('; ')}` : '', job.benefits.length ? `Benefícios: ${job.benefits.join('; ')}` : '', job.pcd ? 'Vaga afirmativa para pessoas com deficiência (PCD).' : ''].filter(Boolean).join('\n\n');
}

export function buildJobFeedXml(company: FeedCompany, jobs: FeedJob[], appBase: string, now = new Date()): string {
  const items = jobs.map((job) => {
    const { city, state } = splitLocation(job.location);
    return `  <job>
    <title>${cdata(job.title)}</title>
    <date>${cdata(new Date(job.createdAt).toUTCString())}</date>
    <referencenumber>${cdata(job.id)}</referencenumber>
    <url>${cdata(jobUrl(company, job, appBase, 'indeed'))}</url>
    <company>${cdata(company.name)}</company>
    <city>${cdata(city)}</city>
    <state>${cdata(state)}</state>
    <country>${cdata('BR')}</country>
    <description>${cdata(fullDescription(job))}</description>
    <salary>${salaryText(job) ? cdata(salaryText(job)) : ''}</salary>
    <jobtype>${cdata(JOBTYPE[String(job.employmentType ?? '').toUpperCase()] ?? 'fulltime')}</jobtype>
    <category>${cdata(job.department ?? '')}</category>
    <experience>${cdata(job.seniority ?? '')}</experience>
  </job>`;
  });
  return `<?xml version="1.0" encoding="utf-8"?>\n<source>\n  <publisher>${xmlText(company.name)}</publisher>\n  <publisherurl>${xmlText(companyBase(company, appBase))}</publisherurl>\n  <lastBuildDate>${now.toUTCString()}</lastBuildDate>\n${items.join('\n')}\n</source>\n`;
}

export function buildJobFeedJson(company: FeedCompany, jobs: FeedJob[], appBase: string, now = new Date()) {
  return {
    company: { id: company.id, name: company.name, url: companyBase(company, appBase) },
    generatedAt: now.toISOString(),
    jobs: jobs.map((job) => {
      const { city, state } = splitLocation(job.location);
      return {
        id: job.id, title: job.title, description: fullDescription(job), url: jobUrl(company, job, appBase), datePosted: iso(job.createdAt), validThrough: iso(job.deadline),
        employmentType: SCHEMA_TYPE[String(job.employmentType ?? '').toUpperCase()] ?? 'FULL_TIME', city, state, country: 'BR', remote: isRemote(job), pcd: Boolean(job.pcd), openings: job.openings,
        salary: job.salaryHidden || (!job.salaryMin && !job.salaryMax) ? null : { currency: 'BRL', min: job.salaryMin, max: job.salaryMax, unit: 'MONTH' },
        department: job.department, seniority: job.seniority,
      };
    }),
  };
}
