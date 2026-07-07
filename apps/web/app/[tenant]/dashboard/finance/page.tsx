import { redirect } from 'next/navigation';
export default function FinancePage({ params }: { params: { tenant: string } }) { redirect(`/${params.tenant}/dashboard`); }
