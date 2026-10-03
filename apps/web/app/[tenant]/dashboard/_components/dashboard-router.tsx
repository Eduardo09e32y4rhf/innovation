'use client';

import React from 'react';
import { CeoDashboard } from './role-dashboards/ceo-dashboard';
import { CommercialDashboard } from './role-dashboards/commercial-dashboard';
import { AccountingDashboard } from './role-dashboards/accounting-dashboard';
import { HrDashboard } from './role-dashboards/hr-dashboard';

// Simulação de enum/tipagem baseada na API
type UserRole = 'DEV' | 'CEO' | 'COMERCIAL' | 'CONTABIL' | 'RH' | 'ADMIN' | 'GESTOR' | 'FUNCIONARIO';

interface DashboardRouterProps {
  userRole: UserRole;
  // Na prática, estes dados virão do React Query ou Server Actions
  dashboardData: any; 
}

/**
 * Componente Roteador: Renderiza o painel correto de acordo com a permissão (Lote P7)
 */
export function DashboardRouter({ userRole, dashboardData }: DashboardRouterProps) {
  switch (userRole) {
    case 'DEV':
    case 'CEO':
      return <CeoDashboard {...dashboardData.ceoMetrics} />;
      
    case 'COMERCIAL':
      return <CommercialDashboard {...dashboardData.commercialMetrics} />;
      
    case 'CONTABIL':
      return <AccountingDashboard {...dashboardData.accountingMetrics} />;
      
    case 'RH':
    case 'ADMIN':
      return <HrDashboard {...dashboardData.hrMetrics} />;
      
    default:
      // Para FUNCIONARIO e GESTOR, pode haver um dashboard focado em seu próprio Ponto/Escala
      return (
        <div className="p-6 bg-white border rounded-xl">
          <h1 className="text-xl font-bold">Meu Painel</h1>
          <p className="text-slate-500 mt-2">Bem-vindo(a) ao sistema.</p>
        </div>
      );
  }
}
