import { redirect } from 'next/navigation';

export default function TimeTrackClockInPage({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas?view=ponto`);
}
