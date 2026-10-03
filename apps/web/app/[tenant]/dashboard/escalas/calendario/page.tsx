import { redirect } from 'next/navigation';

export default function EscalasCalendarioPage({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas?view=calendario`);
}
