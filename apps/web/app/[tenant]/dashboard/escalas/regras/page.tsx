import { redirect } from 'next/navigation';

export default function EscalasRegrasPage({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas?view=modelos`);
}
