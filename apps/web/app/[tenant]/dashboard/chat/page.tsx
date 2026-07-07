import { redirect } from 'next/navigation';
export default function ChatPage({ params }: { params: { tenant: string } }) { redirect(`/${params.tenant}/dashboard/whatsapp`); }
