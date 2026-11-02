import type { Metadata } from 'next';
import { InternalJobClient } from './client';

export const metadata: Metadata = { title: 'Vaga interna', robots: { index: false, follow: false } };

export default async function Page(props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params;
  return <InternalJobClient jobId={params.jobId} />;
}
