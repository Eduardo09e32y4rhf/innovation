'use client';

import dynamic from 'next/dynamic';
import { useRoboLigado } from './ligado';

// O pacote do robo so e baixado quando um DEV liga a chave (Dashboard DEV ou Plataforma > Configuracoes).
const RoboQa = dynamic(() => import('./RoboQa'), { ssr: false });

/**
 * Com a chave ligada o robo fica FLUTUANTE em todas as telas deste navegador, inclusive no login: ele precisa
 * continuar visivel quando troca de usuario (ADMIN, RH, FUNCIONARIO...). Quem decide o que mostrar e o proprio robo:
 * so um DEV consegue iniciar, e para os outros perfis ele so aparece enquanto o teste estiver em andamento.
 */
export function RoboQaGate() {
  const ligado = useRoboLigado();
  return ligado ? <RoboQa /> : null;
}
