"use client";
import { useState } from 'react';
import { Building2, Link2, CheckCircle2, RefreshCw, Eye, EyeOff, ChevronRight, AlertCircle } from 'lucide-react';

const BANKS = [
  { id: 'itau',     name: 'Itaú Unibanco',    logo: '🏦', connected: true,  saldo: 'R$ 48.320,00', agencia: '1234', conta: '56789-0' },
  { id: 'bradesco', name: 'Bradesco',          logo: '🏛️', connected: false, saldo: null, agencia: '', conta: '' },
  { id: 'bb',       name: 'Banco do Brasil',   logo: '🏢', connected: false, saldo: null, agencia: '', conta: '' },
  { id: 'sicoob',   name: 'Sicoob',            logo: '🤝', connected: false, saldo: null, agencia: '', conta: '' },
  { id: 'nubank',   name: 'Nubank',            logo: '💜', connected: false, saldo: null, agencia: '', conta: '' },
  { id: 'inter',    name: 'Banco Inter',       logo: '🟠', connected: false, saldo: null, agencia: '', conta: '' },
];

const DDA = [
  { id: 'D001', credor: 'Fornecedor Tech Ltda',    valor: 'R$ 3.200,00', vencimento: '10/05/2026', status: 'pendente', debito: true  },
  { id: 'D002', credor: 'Licença Adobe',           valor: 'R$ 890,00',  vencimento: '12/05/2026', status: 'pendente', debito: false },
  { id: 'D003', credor: 'AWS Cloud Services',      valor: 'R$ 1.450,00', vencimento: '15/05/2026', status: 'agendado', debito: true  },
  { id: 'D004', credor: 'Aluguel Escritório',      valor: 'R$ 4.800,00', vencimento: '05/05/2026', status: 'pago',    debito: true  },
  { id: 'D005', credor: 'Google Workspace',        valor: 'R$ 320,00',  vencimento: '20/05/2026', status: 'pendente', debito: false },
];

export default function BankPage() {
  const [showBalance, setShowBalance] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const sync = () => { setSyncing(true); setTimeout(() => setSyncing(false), 2000); };

  return (
    <div className="space-y-5">
      {/* Connected bank */}
      <div className="grid grid-cols-[1fr_340px] gap-4">
        <div className="dash-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">Contas Conectadas</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Open Banking — atualizado há 5 min</p>
            </div>
            <button onClick={sync} className={`btn-outline flex items-center gap-1.5 ${syncing ? 'opacity-60' : ''}`} disabled={syncing}>
              <RefreshCw size={12} strokeWidth={2} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>

          <div className="space-y-3">
            {BANKS.map(bank => (
              <div key={bank.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                bank.connected
                  ? 'border-teal-200 bg-teal-50/60'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{bank.logo}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900">{bank.name}</p>
                    {bank.connected
                      ? <p className="text-[11px] text-gray-400">Ag {bank.agencia} · Cc {bank.conta}</p>
                      : <p className="text-[11px] text-gray-400">Não conectado</p>
                    }
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {bank.connected && bank.saldo && (
                    <div className="text-right">
                      <p className="text-[11px] text-gray-400">Saldo</p>
                      <p className="text-[14px] font-bold text-gray-900">
                        {showBalance ? bank.saldo : '••••••'}
                      </p>
                    </div>
                  )}
                  {bank.connected
                    ? <span className="badge badge-green"><CheckCircle2 size={9} />Ativa</span>
                    : (
                      <button
                        onClick={() => setConnecting(bank.id)}
                        className="btn-black text-[11px] px-3 py-1.5"
                      >
                        <Link2 size={11} strokeWidth={2.2} />
                        Conectar
                      </button>
                    )
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saldo consolidado */}
        <div className="space-y-4">
          <div className="dash-hero p-6">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-teal-400">Saldo Consolidado</p>
                <button onClick={() => setShowBalance(v => !v)} className="text-white/40 hover:text-white/70 transition-colors">
                  {showBalance ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[36px] font-black text-white leading-none tracking-tight">
                {showBalance ? 'R$ 48.320' : 'R$ ••••••'}
              </p>
              <p className="mt-2 text-[11px] text-white/40">1 conta conectada</p>
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Entradas (mês)</p>
                  <p className="text-[16px] font-bold text-teal-400 mt-0.5">R$ 31.200</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Saídas (mês)</p>
                  <p className="text-[16px] font-bold text-red-400 mt-0.5">R$ 13.800</p>
                </div>
              </div>
            </div>
          </div>

          <div className="dash-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={14} className="text-amber-500" />
              <p className="text-[13px] font-semibold text-gray-900">DDA a vencer</p>
            </div>
            <p className="text-[28px] font-black text-gray-900">3</p>
            <p className="text-[11px] text-gray-400 mt-0.5">cobranças nos próximos 7 dias</p>
            <p className="text-[14px] font-bold text-amber-600 mt-2">R$ 5.540,00</p>
          </div>
        </div>
      </div>

      {/* DDA Table */}
      <div className="dash-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-[14px] font-bold text-gray-900">DDA — Débito Direto Autorizado</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Cobranças registradas no seu CNPJ/CPF</p>
          </div>
          <span className="badge badge-amber">3 pendentes</span>
        </div>
        <table className="table-premium w-full">
          <thead><tr>
            {['ID','Credor','Valor','Vencimento','Débito Auto','Status','Ação'].map(h =>
              <th key={h} className="px-5">{h}</th>
            )}
          </tr></thead>
          <tbody>
            {DDA.map(d => (
              <tr key={d.id} className="cursor-pointer">
                <td className="px-5 text-[11px] text-gray-400 font-mono">{d.id}</td>
                <td className="px-5 text-[12px] font-medium text-gray-900">{d.credor}</td>
                <td className="px-5 text-[13px] font-bold text-gray-900">{d.valor}</td>
                <td className="px-5 text-[12px] text-gray-600">{d.vencimento}</td>
                <td className="px-5">
                  <span className={`badge ${d.debito ? 'badge-green' : 'badge-gray'}`}>
                    {d.debito ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td className="px-5">
                  <span className={`badge ${
                    d.status === 'pago' ? 'badge-green' :
                    d.status === 'agendado' ? 'badge-blue' : 'badge-amber'
                  }`}>{d.status}</span>
                </td>
                <td className="px-5">
                  {d.status === 'pendente' && (
                    <button className="btn-black text-[11px] px-3 py-1.5">
                      Pagar <ChevronRight size={11} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
