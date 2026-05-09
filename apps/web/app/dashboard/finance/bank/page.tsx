"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Link2, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  DdaBoleto,
  DdaProvider,
  DdaProviderId,
  connectDdaProvider,
  fallbackDdaBoletos,
  fallbackDdaProviders,
  formatCurrency,
  formatDate,
  getDdaBoletos,
  getDdaProviders,
  reconcileDdaBoleto,
} from '../api';

const sourceLabels: Record<DdaBoleto['source'], string> = {
  BOLETO: 'Boleto',
  PIX: 'Pix',
  CARD: 'Cartao',
  TRANSFER: 'Transf.',
};

export default function BankPage() {
  const [showBalance, setShowBalance] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState<DdaProviderId | null>(null);
  const [reconciling, setReconciling] = useState<string | null>(null);
  const [providers, setProviders] = useState<DdaProvider[]>(fallbackDdaProviders);
  const [entries, setEntries] = useState<DdaBoleto[]>(fallbackDdaBoletos);

  const load = async () => {
    setSyncing(true);
    const [nextProviders, nextEntries] = await Promise.all([
      getDdaProviders(),
      getDdaBoletos(),
    ]);
    setProviders(nextProviders);
    setEntries(nextEntries);
    setSyncing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleConnect = async (providerId: DdaProviderId) => {
    setConnecting(providerId);
    try {
      const connected = await connectDdaProvider(providerId);
      setProviders((current) => current.map((provider) => provider.id === providerId ? connected : provider));
      setEntries(await getDdaBoletos());
    } finally {
      setConnecting(null);
    }
  };

  const handleReconcile = async (entry: DdaBoleto) => {
    setReconciling(entry.id);
    try {
      const reconciled = await reconcileDdaBoleto(entry);
      setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, ...reconciled, status: 'RECONCILED' } : item));
    } finally {
      setReconciling(null);
    }
  };

  const connectedCount = providers.filter(provider => provider.connected).length;
  const importedBalance = providers.reduce((total, provider) => total + (provider.connected ? provider.balance : 0), 0);
  const pendingEntries = entries.filter(entry => entry.status === 'PENDING');
  const pendingTotal = pendingEntries.reduce((total, entry) => total + entry.amount, 0);
  const reconciledTotal = entries.filter(entry => entry.status === 'RECONCILED').reduce((total, entry) => total + entry.amount, 0);
  const monthRevenue = entries.reduce((total, entry) => total + entry.amount, 0);
  const lastSyncLabel = useMemo(() => {
    const dates = providers.map(provider => provider.lastSyncAt).filter(Boolean) as string[];
    if (!dates.length) return 'Aguardando primeira sincronizacao';
    return `Atualizado em ${formatDate(dates.sort().at(-1))}`;
  }, [providers]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div className="dash-card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">Provedores Financeiros</h3>
              <p className="mt-0.5 text-[11px] text-gray-400">Controle, extrato e conciliacao - sem execucao de pagamento</p>
            </div>
            <button onClick={load} className={`btn-outline flex items-center gap-1.5 ${syncing ? 'opacity-60' : ''}`} disabled={syncing}>
              <RefreshCw size={12} strokeWidth={2} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>

          <div className="space-y-3">
            {providers.map(provider => (
              <div key={provider.id} className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                provider.connected
                  ? 'border-teal-200 bg-teal-50/60'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-[12px] font-black ${
                    provider.connected ? 'bg-teal-600 text-white' : 'bg-white text-gray-500'
                  }`}>
                    {provider.initials}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900">{provider.name}</p>
                    {provider.connected
                      ? <p className="text-[11px] text-gray-400">Conta conectada - {provider.scope}</p>
                      : <p className="text-[11px] text-gray-400">{provider.scope} - nao conectado</p>
                    }
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {provider.connected && (
                    <div className="text-right">
                      <p className="text-[11px] text-gray-400">Saldo importado</p>
                      <p className="text-[14px] font-bold text-gray-900">
                        {showBalance ? formatCurrency(provider.balance) : '******'}
                      </p>
                    </div>
                  )}
                  {provider.connected
                    ? <span className="badge badge-green"><CheckCircle2 size={9} />Ativa</span>
                    : (
                      <button
                        onClick={() => void handleConnect(provider.id)}
                        className="btn-black px-3 py-1.5 text-[11px]"
                        disabled={connecting === provider.id}
                      >
                        <Link2 size={11} strokeWidth={2.2} />
                        {connecting === provider.id ? 'Conectando...' : 'Conectar'}
                      </button>
                    )
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="dash-hero p-6">
            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-400">Saldo Importado</p>
                <button onClick={() => setShowBalance(value => !value)} className="text-white/40 transition-colors hover:text-white/70">
                  {showBalance ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[36px] font-black leading-none tracking-tight text-white">
                {showBalance ? formatCurrency(importedBalance) : 'R$ ******'}
              </p>
              <p className="mt-2 text-[11px] text-white/40">{connectedCount} provedor(es) conectado(s)</p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Volume importado</p>
                  <p className="mt-0.5 text-[16px] font-bold text-teal-400">{formatCurrency(monthRevenue)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Conciliado</p>
                  <p className="mt-0.5 text-[16px] font-bold text-blue-300">{formatCurrency(reconciledTotal)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="dash-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck size={14} className="text-teal-600" />
              <p className="text-[13px] font-semibold text-gray-900">Controle operacional</p>
            </div>
            <p className="text-[28px] font-black text-gray-900">0</p>
            <p className="mt-0.5 text-[11px] text-gray-400">pagamentos executados pelo app</p>
            <p className="mt-2 text-[14px] font-bold text-teal-600">Conciliacao e baixa manual</p>
          </div>

          <div className="dash-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-500" />
              <p className="text-[13px] font-semibold text-gray-900">Pendencias</p>
            </div>
            <p className="text-[28px] font-black text-gray-900">{pendingEntries.length}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">itens aguardando conciliacao</p>
            <p className="mt-2 text-[14px] font-bold text-amber-600">{formatCurrency(pendingTotal)}</p>
          </div>
        </div>
      </div>

      <div className="dash-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-[14px] font-bold text-gray-900">Conciliacao de Cobrancas</h3>
            <p className="mt-0.5 text-[11px] text-gray-400">{lastSyncLabel}</p>
          </div>
          <span className="badge badge-amber">{pendingEntries.length} pendentes</span>
        </div>
        <table className="table-premium w-full">
          <thead>
            <tr>
              {['ID', 'Provedor', 'Descricao', 'Valor', 'Vencimento', 'Origem', 'Status', 'Acao'].map(header =>
                <th key={header} className="px-5">{header}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id} className="cursor-pointer">
                <td className="px-5 font-mono text-[11px] text-gray-400">{entry.id}</td>
                <td className="px-5 text-[12px] font-medium text-gray-900">{entry.providerName}</td>
                <td className="px-5 text-[12px] font-medium text-gray-900">{entry.description}</td>
                <td className="px-5 text-[13px] font-bold text-gray-900">{formatCurrency(entry.amount)}</td>
                <td className="px-5 text-[12px] text-gray-600">{formatDate(entry.dueDate)}</td>
                <td className="px-5">
                  <span className="badge badge-gray">{sourceLabels[entry.source]}</span>
                </td>
                <td className="px-5">
                  <span className={`badge ${entry.status === 'RECONCILED' ? 'badge-green' : 'badge-amber'}`}>
                    {entry.status === 'RECONCILED' ? 'conciliado' : 'pendente'}
                  </span>
                </td>
                <td className="px-5">
                  {entry.status === 'PENDING' ? (
                    <button
                      onClick={() => void handleReconcile(entry)}
                      className="btn-outline px-3 py-1.5 text-[11px]"
                      disabled={reconciling === entry.id}
                    >
                      {reconciling === entry.id ? 'Baixando...' : 'Baixar manualmente'}
                    </button>
                  ) : <span className="text-[11px] text-gray-300">--</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
