import { redirect } from 'next/navigation';

export default function SegurancaRedirect({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/management/seguranca/aso`);
}
