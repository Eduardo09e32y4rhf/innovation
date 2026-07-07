import { redirect } from 'next/navigation';
export default function MediaPage({ params }: { params: { tenant: string } }) { redirect(`/${params.tenant}/dashboard`); }
