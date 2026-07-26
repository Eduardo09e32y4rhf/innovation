'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function PlatformDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const tenant = String(params?.tenant || '');

  useEffect(() => {
    if (tenant) {
      router.replace(`/${tenant}/dashboard/platform/finance`);
    }
  }, [tenant, router]);

  return null;
}
