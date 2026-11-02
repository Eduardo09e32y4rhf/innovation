import type { Metadata } from 'next';
import { StatusClient } from './status-client';

export const metadata: Metadata = { title: 'Acompanhar candidatura', robots: { index: false, follow: false } };

export default async function CandidateStatusPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return <StatusClient token={params.token} />;
}