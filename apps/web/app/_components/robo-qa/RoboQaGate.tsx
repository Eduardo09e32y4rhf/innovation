'use client';

import dynamic from 'next/dynamic';

const RoboQa = dynamic(() => import('./RoboQa'), { ssr: false });

/**
 * Robo flutuante SEMPRE presente (inclusive na tela de login), para acompanhar cada troca de perfil durante o teste.
 * So um DEV consegue iniciar; para os demais ele e apenas o botao. Para tirar do site: NEXT_PUBLIC_ROBO_QA=off no
 * .env e refazer o build (vps-update.sh).
 */
export function RoboQaGate() {
  if (process.env.NEXT_PUBLIC_ROBO_QA === 'off') return null;
  return <RoboQa />;
}
