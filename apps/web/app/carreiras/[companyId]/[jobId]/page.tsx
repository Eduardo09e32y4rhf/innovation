import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { JobDetails } from './job-details';

type JobDetailsPageProps = {
  params: Promise<{
    companyId: string;
    jobId: string;
  }>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function generateMetadata(props: JobDetailsPageProps): Promise<Metadata> {
  const { companyId, jobId } = await props.params;
  const requestHeaders = await headers();
  const host = (requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? '').split(',')[0].trim();
  const safeHost = /^[A-Za-z0-9.-]+(?::\d+)?$/.test(host) ? host : 'localhost:3000';
  const forwardedProtocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0].trim();
  const protocol = forwardedProtocol === 'http' || forwardedProtocol === 'https'
    ? forwardedProtocol
    : process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const origin = `${protocol}://${safeHost}`;
  const fallbackDescription = 'Confira os detalhes da oportunidade e envie sua candidatura.';
  const canonicalUrl = new URL(
    `/carreiras/${encodeURIComponent(companyId)}/${encodeURIComponent(jobId)}`,
    origin,
  ).toString();
  const fallback: Metadata = {
    title: 'Detalhes da vaga',
    description: fallbackDescription,
    alternates: { canonical: canonicalUrl },
  };
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';

  try {
    const apiUrl = new URL(
      `${apiBase.replace(/\/+$/, '')}/public/jobs/${encodeURIComponent(jobId)}`,
      origin,
    );
    const response = await fetch(apiUrl, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) return fallback;

    let payload: unknown = await response.json();
    let record = asRecord(payload);
    if (record && 'success' in record && 'data' in record) {
      payload = record.data;
      record = asRecord(payload);
    }
    const job = asRecord(record?.job) ?? record;
    if (!job || typeof job.title !== 'string') return fallback;
    const company = asRecord(job.company) ?? asRecord(record?.company);
    const companyName = typeof company?.name === 'string' ? company.name : 'Empresa';
    const title = `${job.title} | ${companyName}`;
    const description = typeof job.description === 'string'
      ? job.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
      : '';
    const imageValue = typeof company?.logoUrl === 'string' ? company.logoUrl.trim() : '';
    let imageUrl: string | undefined;
    if (imageValue) {
      try {
        const resolvedImage = new URL(imageValue, origin);
        if (['http:', 'https:'].includes(resolvedImage.protocol)) imageUrl = resolvedImage.toString();
      } catch {
        imageUrl = undefined;
      }
    }
    const metaDescription = description || fallbackDescription;

    return {
      ...fallback,
      title,
      description: metaDescription,
      openGraph: {
        type: 'website',
        title,
        description: metaDescription,
        url: canonicalUrl,
        ...(imageUrl ? { images: [{ url: imageUrl, alt: `${companyName} — ${job.title}` }] } : {}),
      },
      twitter: {
        card: imageUrl ? 'summary_large_image' : 'summary',
        title,
        description: metaDescription,
        ...(imageUrl ? { images: [imageUrl] } : {}),
      },
    };
  } catch (error) {
    console.error('Falha ao carregar metadados sociais da vaga:', error);
    return fallback;
  }
}

export default async function JobDetailsPage(props: JobDetailsPageProps) {
  const params = await props.params;
  return <JobDetails companyId={params.companyId} jobId={params.jobId} />;
}
