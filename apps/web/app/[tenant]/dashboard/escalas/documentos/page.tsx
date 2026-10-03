import { redirect } from 'next/navigation';

export default function EscalasDocumentosPage({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/escalas?view=fechamento`);
}
