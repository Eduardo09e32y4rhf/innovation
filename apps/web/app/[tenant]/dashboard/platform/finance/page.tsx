'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** O financeiro da Plataforma agora vive na aba Faturas. Esta rota fica só para links antigos. */
export default function FinanceMovedPage() {
  const router = useRouter();
  const { tenant = '' } = useParams<{ tenant: string }>();
  useEffect(() => { router.replace(`/${tenant}/dashboard/faturas`); }, [router, tenant]);
  return <p role="status" className="p-4 text-sm text-fg-mut">Abrindo a aba Faturas...</p>;
}
