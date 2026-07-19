'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { NotificationBell } from './notification-bell';

export function DashboardTopbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">Innovation RH System</span>
        <h1>Gestão de pessoas e jornada</h1>
      </div>

      <div className="top-actions">
        {/* We can hide search on small screens via CSS */}
        <label className="search">
          <span>⌕</span>
          <input placeholder="Buscar no sistema" />
        </label>
        
        <NotificationBell />
        
        {isAuthenticated ? (
          <button type="button" onClick={logout} className="primary-button" style={{ background: '#d92d20' }}>
            Sair
          </button>
        ) : (
          <Link href="/login" className="primary-button">
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
