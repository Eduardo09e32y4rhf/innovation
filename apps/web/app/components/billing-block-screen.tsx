import React from 'react';
import { AlertTriangle, CreditCard, ExternalLink } from 'lucide-react';

interface BillingBlockScreenProps {
  paymentLink?: string;
}

export function BillingBlockScreen({ paymentLink }: BillingBlockScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden text-center p-8 border border-red-100 dark:border-red-900/30">
        <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Acesso Suspenso
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Sua empresa possui faturas em atraso. Para restaurar o acesso à plataforma, por favor regularize os pagamentos pendentes.
        </p>

        {paymentLink ? (
          <a
            href={paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-red-500/20"
          >
            <CreditCard className="w-5 h-5" />
            Pagar Fatura
            <ExternalLink className="w-4 h-4 ml-1" />
          </a>
        ) : (
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-500">
            Entre em contato com o suporte para receber o link de pagamento.
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
          >
            Sair e voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
}
