import type { Metadata } from 'next';
import { AssessmentClient } from './client';

export const metadata: Metadata = { title: 'Teste da candidatura', robots: { index: false, follow: false } };

export default async function Page(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return <AssessmentClient token={params.token} />;
}
