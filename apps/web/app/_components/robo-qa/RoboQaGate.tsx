'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/app/contexts/AuthContext';
import { resolveUserRole } from '@/app/lib/user-role';
import { useRoboLigado } from './ligado';

// O pacote do robo so e baixado quando um DEV liga a chave na pagina da Plataforma.
const RoboQa = dynamic(() => import('./RoboQa'), { ssr: false });

/** Mostra o robo somente para DEV logado com a chave ligada. Qualquer outro perfil nunca carrega nada. */
export function RoboQaGate() {
  const { user } = useAuth();
  const ligado = useRoboLigado();
  if (!ligado || !user || resolveUserRole(user) !== 'DEV') return null;
  return <RoboQa />;
}
