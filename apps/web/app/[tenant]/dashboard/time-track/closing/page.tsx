import { redirect } from 'next/navigation';
export default function TimeClosingPage({ params }: { params: { tenant: string } }) { redirect(//dashboard/management?tab=closing); }