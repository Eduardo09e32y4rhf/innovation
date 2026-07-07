import { redirect } from 'next/navigation';
export default function PontoPage({ params }: { params: { tenant: string } }) { redirect(`/${params.tenant}/dashboard/time-track`); }
