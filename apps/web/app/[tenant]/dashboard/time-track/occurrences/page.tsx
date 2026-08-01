import { redirect } from 'next/navigation';

export default function TimeOccurrencesRedirect({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas/ocorrencias`);
}