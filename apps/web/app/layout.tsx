import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './contexts/Providers';

export const metadata: Metadata = {
  title: 'Innovation RH Connect',
  description: 'Sistema de RH com controle de ponto e WhatsApp',
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
