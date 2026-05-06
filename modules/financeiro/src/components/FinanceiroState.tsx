import React from 'react';

type Props = {
  title: string;
  status: 'loading' | 'error' | 'empty' | 'unauthenticated' | 'validation';
  message?: string;
  children?: React.ReactNode;
};

export const FinanceiroState = ({ title, status, message, children }: Props) => {
  if (status === 'loading') return <div aria-busy="true">Carregando {title}...</div>;
  if (status === 'error' || status === 'validation') return <div role="alert">{message || 'Erro ao carregar módulo financeiro'}</div>;
  if (status === 'unauthenticated') return <div role="alert">Autenticação necessária</div>;
  if (status === 'empty') return <div>Nenhum dado disponível para {title}</div>;
  return <>{children}</>;
};
