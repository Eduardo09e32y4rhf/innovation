import { redirect } from 'next/navigation';

export default function WorkScheduleRulesRedirect({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas/regras`);
}
