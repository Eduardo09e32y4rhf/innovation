import type { Metadata } from 'next';
import { OfferClient } from './client';

export const metadata: Metadata = { title: 'Proposta de emprego', robots: { index: false, follow: false } };

export default function Page({ params }: { params: { token: string } }) {
  return <OfferClient token={params.token} />;
}
