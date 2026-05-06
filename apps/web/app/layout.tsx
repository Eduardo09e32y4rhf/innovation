'use client';

import './globals.css';
import { Providers } from './contexts/Providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gradient-to-br from-[#05050a] via-black to-[#080812]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

