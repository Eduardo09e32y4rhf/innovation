import { redirect } from 'next/navigation';

export default function ManagementRedirect({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/management/agenda`);
}
