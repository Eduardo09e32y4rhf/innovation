import { redirect } from 'next/navigation';
export default function ColaboradoresPage({ params }: { params: { tenant: string } }) { redirect(`/${params.tenant}/dashboard/employees`); }
