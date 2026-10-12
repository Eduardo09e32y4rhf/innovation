import type { Metadata } from 'next';
import { StatusClient } from './status-client';

export const metadata: Metadata = { title: 'Acompanhar candidatura', robots: { index: false, follow: false } };

export default function CandidateStatusPage({ params }: { params: { token: string } }) {
  return <StatusClient token={params.token} />;
}