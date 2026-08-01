'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EscalaRedirect() {
  const router = useRouter();
  const params = useParams();
  const tenant = String(params?.tenant || '');
  useEffect(() => {
    router.replace(`/${tenant}/dashboard/escalas/calendario`);
  }, [router, tenant]);

  return (
    <div className="p-8 max-w-2xl mx-auto mt-20">
      <p className="mt-4 text-slate-500 text-sm text-center">Redirecionando para Escalas...</p>
    </div>
  );
}
