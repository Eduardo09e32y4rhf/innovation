import type { Metadata } from 'next';
import { OfferClient } from './client';

export const metadata: Metadata = { title: 'Proposta de emprego', robots: { index: false, follow: false } };

export default async function Page(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return <OfferClient token={params.token} />;
}
