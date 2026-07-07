import { redirect } from 'next/navigation';
export default function RhPage({ params }: { params: { tenant: string } }) { redirect(`/${params.tenant}/dashboard/management`); }
