import { redirect } from 'next/navigation';

export default function TimeTrackRulesPage({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas?view=modelos`);
}
