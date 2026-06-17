// Placeholder Next.js 14 app layout
'use client'

import './globals.css'
import React from 'react'

export const metadata = {
  title: 'Innovation RH Connect',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
