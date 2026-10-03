import { redirect } from 'next/navigation';

export default function EscalasFechamentoPage({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas?view=fechamento`);
}
