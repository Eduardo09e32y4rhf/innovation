'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { LoadingState } from '@/app/components/platform-ui';
import { EscalasNav } from './_components/escalas-nav';
import { getActiveNavItem } from './_components/escalas-nav-config';
import styles from './_components/operational-ui.module.css';

export default function EscalasLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const params = useParams();
  const pathname = usePathname();
  const tenant = String(params?.tenant ?? '');

  if (loading) return <LoadingState label="Carregando módulo de escalas..." />;
  if (!user) return null;

  const activeItem = getActiveNavItem(pathname ?? '', tenant);

  return (
    <div className={`${styles.surface} w-full min-w-0 space-y-5`}>
      <p className="text-sm text-fg-mut">Escalas{activeItem && activeItem.href !== '' ? ` / ${activeItem.title}` : ''}</p>

      <EscalasNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
