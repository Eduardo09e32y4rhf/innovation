import { redirect } from 'next/navigation';

export default function AccountingRedirect({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/contabilidade`);
}
