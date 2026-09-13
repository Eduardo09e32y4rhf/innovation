'use client';
import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { LanguageProvider } from './LanguageContext';
import { Toaster } from 'sonner';

export const Providers: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <LanguageProvider>
      <AuthProvider>
        {children}
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </LanguageProvider>
  );
};
