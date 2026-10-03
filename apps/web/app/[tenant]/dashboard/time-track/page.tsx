import { redirect } from 'next/navigation';

export default function TimeTrackPage({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas?view=ponto`);
}
