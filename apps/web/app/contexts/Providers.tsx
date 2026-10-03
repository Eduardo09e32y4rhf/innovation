'use client';
import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { LanguageProvider } from './LanguageContext';
import { Toaster } from 'sonner';
import { AppearanceProvider } from './AppearanceContext';

export const Providers: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppearanceProvider>
          {children}
          <Toaster position="top-right" richColors />
        </AppearanceProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};
