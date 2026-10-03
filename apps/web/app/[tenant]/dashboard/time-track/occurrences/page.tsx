import { redirect } from 'next/navigation';

export default function TimeTrackOccurrencesPage({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas?view=aprovacoes`);
}
