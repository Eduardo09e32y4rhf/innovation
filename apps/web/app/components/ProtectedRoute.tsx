'use client';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import React, { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#05050a] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 grad-bg rounded-2xl flex items-center justify-center font-bold text-3xl text-white shadow-2xl shadow-purple-500/30 animate-pulse">
          I
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        <p className="text-gray-500 text-sm">Preparando seu acesso...</p>
      </div>
    );
  }

  return <>{children}</>;
};
