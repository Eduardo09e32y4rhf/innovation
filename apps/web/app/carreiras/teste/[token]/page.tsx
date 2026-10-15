import type { Metadata } from 'next';
import { AssessmentClient } from './client';

export const metadata: Metadata = { title: 'Teste da candidatura', robots: { index: false, follow: false } };

export default function Page({ params }: { params: { token: string } }) {
  return <AssessmentClient token={params.token} />;
}
