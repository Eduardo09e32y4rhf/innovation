import type { Metadata } from 'next';
import { ConsentClient } from './consent-client';

export const metadata: Metadata = { title: 'Meus consentimentos', robots: { index: false, follow: false } };

export default async function ConsentPage(props: { searchParams: Promise<{ token?: string; acao?: string }> }) {
  const { token, acao } = await props.searchParams;
  return <ConsentClient token={typeof token === 'string' ? token : ''} action={acao === 'confirmar' ? 'confirm' : 'revoke'} />;
}
