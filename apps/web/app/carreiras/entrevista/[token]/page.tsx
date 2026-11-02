import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InterviewClient } from './client';

export const metadata: Metadata = { title: 'Sua entrevista', robots: { index: false, follow: false } };

export default async function Page(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return <Suspense><InterviewClient token={params.token} /></Suspense>;
}
