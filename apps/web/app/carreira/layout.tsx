import './candidate.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CandidateLayout } from './_components/candidate-layout';

export const metadata: Metadata = {
  title: 'Área do candidato',
  description: 'Acompanhe suas candidaturas e mantenha seu perfil para se candidatar mais rápido.',
  robots: { index: false, follow: false },
};

export default function CandidateRouteLayout({ children }: { children: ReactNode }) {
  return <CandidateLayout>{children}</CandidateLayout>;
}
