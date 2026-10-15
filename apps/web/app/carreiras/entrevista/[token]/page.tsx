import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InterviewClient } from './client';

export const metadata: Metadata = { title: 'Sua entrevista', robots: { index: false, follow: false } };

export default function Page({ params }: { params: { token: string } }) {
  return <Suspense><InterviewClient token={params.token} /></Suspense>;
}
