import { redirect } from 'next/navigation';
export default function NotificationsPage({ params }: { params: { tenant: string } }) { redirect(//dashboard/management?tab=notifications); }