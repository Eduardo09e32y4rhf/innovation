import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AnnouncementBanner from '@/components/AnnouncementBanner'
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Innovation.ia Enterprise',
  description: 'Sistema Operacional de IA Empresarial',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="light">
      <body className={`font-sans min-h-screen bg-slate-50 text-slate-900 antialiased`}>
        <ReactQueryProvider>
          <AnnouncementBanner />
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  )
}
