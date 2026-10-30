import type { Metadata } from 'next';
import { ConfirmClient } from './confirm-client';

export const metadata: Metadata = { title: 'Confirmar pedido de privacidade', robots: { index: false, follow: false } };

export default async function ConfirmPage(props: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await props.searchParams;
  return <ConfirmClient token={typeof token === 'string' ? token : ''} />;
}
