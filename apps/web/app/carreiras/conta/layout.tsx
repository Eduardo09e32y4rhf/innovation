import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Área do candidato',
  description: 'Acompanhe suas candidaturas e mantenha seu perfil para se candidatar mais rápido.',
  robots: { index: false, follow: false },
};

export default function CandidateAreaLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
