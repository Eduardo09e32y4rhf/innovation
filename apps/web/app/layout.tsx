import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './contexts/Providers';
import { RoboQaGate } from './_components/robo-qa/RoboQaGate';

export const metadata: Metadata = {
  title: {
    default: 'Innovation RH',
    template: '%s | Innovation RH',
  },
  description: 'Plataforma de RH com controle de ponto, férias, alertas e comunicação corporativa.',
  icons: {
    icon: '/logo-innovation-clean.png',
    apple: '/logo-innovation-clean.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === 'production' && <script dangerouslySetInnerHTML={{ __html: "try{localStorage.removeItem('roboQa.contas');sessionStorage.removeItem('roboQa.v1')}catch(e){}" }} />}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('theme');var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}" }} />
      </head>
      <body>
        <Providers>{children}<RoboQaGate /></Providers>
      </body>
    </html>
  );
}
