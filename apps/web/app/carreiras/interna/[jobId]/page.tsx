import type { Metadata } from 'next';
import { InternalJobClient } from './client';

export const metadata: Metadata = { title: 'Vaga interna', robots: { index: false, follow: false } };

export default function Page({ params }: { params: { jobId: string } }) {
  return <InternalJobClient jobId={params.jobId} />;
}
