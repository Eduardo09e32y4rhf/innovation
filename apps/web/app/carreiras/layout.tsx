import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Portal de Carreiras',
  description: 'Encontre oportunidades e candidate-se às vagas abertas.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function CareersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
