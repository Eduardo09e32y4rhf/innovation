import { redirect } from 'next/navigation';
export default function TimeClosingPage({ params }: { params: { tenant: string } }) { redirect(`/${params.tenant}/dashboard/management?tab=closing`); }