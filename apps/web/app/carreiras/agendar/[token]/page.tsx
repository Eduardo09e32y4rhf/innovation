import type { Metadata } from 'next';
import { SlotsClient } from './client';

export const metadata: Metadata = { title: 'Escolha o horário da entrevista', robots: { index: false, follow: false } };

export default async function Page(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return <SlotsClient token={params.token} />;
}
