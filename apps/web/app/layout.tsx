import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './contexts/Providers';

export const metadata: Metadata = {
  title: {
    default: 'Innovation RH System',
    template: '%s | Innovation RH System',
  },
  description: 'Plataforma de RH com controle de ponto, fÃ©rias, alertas e comunicaÃ§Ã£o corporativa.',
  icons: {
    icon: '/innovation-logo-dark.png',
    apple: '/innovation-logo-dark.png',
  },
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
