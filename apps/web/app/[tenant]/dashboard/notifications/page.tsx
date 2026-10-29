import { redirect } from 'next/navigation';
export default async function NotificationsPage(props: { params: Promise<{ tenant: string }> }) {
  const params = await props.params;
  redirect(`/${params.tenant}/dashboard/management?tab=notifications`);
}