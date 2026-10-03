import { redirect } from 'next/navigation';

export default function EscalasPontoPage({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas?view=ponto`);
}
