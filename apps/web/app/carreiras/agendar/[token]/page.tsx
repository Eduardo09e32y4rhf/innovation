import type { Metadata } from 'next';
import { SlotsClient } from './client';

export const metadata: Metadata = { title: 'Escolha o horário da entrevista', robots: { index: false, follow: false } };

export default function Page({ params }: { params: { token: string } }) {
  return <SlotsClient token={params.token} />;
}
