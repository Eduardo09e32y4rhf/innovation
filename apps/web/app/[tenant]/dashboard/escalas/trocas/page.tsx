import { redirect } from 'next/navigation';

export default function EscalasTrocasPage({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas?view=solicitacoes`);
}
