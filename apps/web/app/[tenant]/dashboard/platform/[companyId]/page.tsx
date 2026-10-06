import { redirect } from 'next/navigation';

const TABS = ['general', 'subscription', 'finance', 'users', 'documents', 'support', 'logs'];

// Rota antiga mantida: o dossie da empresa agora e uma secao da tela unica da Plataforma.
export default function Legacy({ params, searchParams }: { params: { tenant: string; companyId: string }; searchParams?: { tab?: string } }) {
  const sub = TABS.includes(String(searchParams?.tab)) ? searchParams?.tab : 'general';
  redirect(`/${params.tenant}/dashboard/platform?tab=dossie&sub=${sub}&company=${encodeURIComponent(params.companyId)}`);
}