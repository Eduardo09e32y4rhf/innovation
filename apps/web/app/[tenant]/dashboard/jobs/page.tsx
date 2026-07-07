import { redirect } from 'next/navigation';
export default function JobsPage({ params }: { params: { tenant: string } }) { redirect(`/${params.tenant}/dashboard`); }
