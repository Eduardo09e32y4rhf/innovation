'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSkeleton } from '@/app/components/platform-ui';

export default function EscalaRedirect({ params }: { params: { tenant: string } }) {
  const router = useRouter();
  useEffect(() => {
    // Redirecionamento para a nova rota unificada de Jornada & Escala
    router.replace(`/${params.tenant}/dashboard/time-track`);
  }, [router, params.tenant]);

  return (
    <div className="p-8 max-w-2xl mx-auto mt-20">
      <LoadingSkeleton rows={4} />
      <p className="mt-4 text-slate-500 text-sm text-center">Redirecionando para o módulo unificado de Jornada & Escala...</p>
    </div>
  );
}
