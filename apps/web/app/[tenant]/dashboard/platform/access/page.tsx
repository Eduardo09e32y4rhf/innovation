import { redirect } from 'next/navigation';

// Rota antiga mantida: agora e uma secao da tela unica da Plataforma.
export default function Legacy({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/platform?tab=configuracoes&sub=acessos`);
}
