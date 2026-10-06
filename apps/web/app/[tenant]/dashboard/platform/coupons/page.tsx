import { redirect } from 'next/navigation';

// Rota antiga mantida: Planos, Assinaturas e Cupons agora ficam em Faturas.
export default function Legacy({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/faturas?aba=cupons`);
}
