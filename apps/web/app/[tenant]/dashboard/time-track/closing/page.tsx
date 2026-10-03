import { redirect } from 'next/navigation';

export default function TimeTrackClosingPage({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas?view=fechamento`);
}
