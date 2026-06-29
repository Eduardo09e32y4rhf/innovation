import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './contexts/Providers';

export const metadata: Metadata = {
  title: {
    default: 'Innovation RH Connect',
    template: '%s | Innovation RH Connect',
  },
  description: 'Plataforma de RH com controle de ponto, férias, alertas e comunicação corporativa.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
