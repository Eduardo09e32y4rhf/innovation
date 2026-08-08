import { redirect } from 'next/navigation';

export default function TimeTrackRedirectPage({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas/ponto`);
}
