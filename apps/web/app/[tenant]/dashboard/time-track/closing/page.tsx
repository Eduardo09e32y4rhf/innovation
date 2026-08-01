import { redirect } from 'next/navigation';

export default function TimeClosingRedirect({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas/fechamento`);
}
