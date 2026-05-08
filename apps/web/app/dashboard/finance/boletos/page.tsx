"use client";
import { useState } from 'react';
import { Plus, Search, Download, AlertTriangle, Clock, CheckCircle2, X } from 'lucide-react';

const boletos = [
  { id: 'B001', desc: 'Mensalidade Plano Growth — Cliente Alpha',   valor: 'R$ 12.800,00', venc: '10/05/2026', emissao: '01/05/2026', status: 'aberto',   tipo: 'receber' },
  { id: 'B002', desc: 'Setup implantação — Cliente Beta',           valor: 'R$ 5.600,00',  venc: '05/05/2026', emissao: '28/04/2026', status: 'vencido',  tipo: 'receber' },
  { id: 'B003', desc: 'Licença software — Fornecedor TechX',        valor: 'R$ 3.200,00',  venc: '12/05/2026', emissao: '01/05/2026', status: 'aberto',   tipo: 'pagar'   },
  { id: 'B004', desc: 'Mensalidade Plano Pro — Cliente Gama',       valor: 'R$ 4.900,00',  venc: '15/05/2026', emissao: '05/05/2026', status: 'aberto',   tipo: 'receber' },
  { id: 'B005', desc: 'Campanha marketing digital',                  valor: 'R$ 2.380,00',  venc: '08/05/2026', emissao: '30/04/2026', status: 'pago',     tipo: 'pagar'   },
  { id: 'B006', desc: 'Consultoria estratégica — Cliente Delta',     valor: 'R$ 3.500,00',  venc: '20/05/2026', emissao: '07/05/2026', status: 'aberto',   tipo: 'receber' },
];

export default function BoletosPage() {
  const [filtro, setFiltro] = useState<'todos' | 'aberto' | 'vencido' | 'pago'>('todos');
  const [tipo, setTipo] = useState<'todos' | 'receber' | 'pagar'>('todos');
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);

  const lista = boletos.filter(b =>
    (filtro === 'todos' || b.status === filtro) &&
    (tipo   === 'todos' || b.tipo   === tipo) &&
    b.desc.toLowerCase().includes(busca.toLowerCase())
  );

  const totalAberto  = boletos.filter(b => b.status === 'aberto').length;
  const totalVencido = boletos.filter(b => b.status === 'vencido').length;
  const valorAberto  = 'R$ 26.800,00';

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Em aberto',     val: String(totalAberto),   sub: valorAberto,    color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200',  icon: Clock },
          { label: 'Vencidos',      val: String(totalVencido),  sub: 'R$ 5.600,00',  color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200',   icon: AlertTriangle },
          { label: 'Pagos (mês)',   val: '4',                   sub: 'R$ 23.480,00', color: 'text-teal-600',  bg: 'bg-teal-50',  border: 'border-teal-200',  icon: CheckCircle2 },
          { label: 'A receber',     val: '4',                   sub: 'R$ 26.800,00', color: 'text-gray-900',  bg: 'bg-gray-50',  border: 'border-gray-200',  icon: Download },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`dash-card p-5 border ${k.border}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium text-gray-500">{k.label}</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.bg}`}>
                  <Icon size={14} className={k.color} strokeWidth={2} />
                </div>
              </div>
              <p className={`text-[28px] font-black leading-none tracking-tight ${k.color}`}>{k.val}</p>
              <p className="text-[12px] text-gray-500 mt-1.5 font-medium">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="search-box flex-1 max-w-xs">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input placeholder="Buscar boleto..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          {(['todos','aberto','vencido','pago'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md capitalize transition-all ${
                filtro === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}>{f}</button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          {(['todos','receber','pagar'] as const).map(t => (
            <button key={t} onClick={() => setTipo(t)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md capitalize transition-all ${
                tipo === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}>{t === 'todos' ? 'Todos' : t === 'receber' ? 'A Receber' : 'A Pagar'}</button>
          ))}
        </div>

        <button onClick={() => setModal(true)} className="btn-black ml-auto">
          <Plus size={13} strokeWidth={2.2} /> Novo Boleto
        </button>
      </div>

      {/* Table */}
      <div className="dash-card overflow-hidden">
        <table className="table-premium w-full">
          <thead><tr>
            {['ID','Descrição','Valor','Emissão','Vencimento','Tipo','Status',''].map(h =>
              <th key={h} className="px-5">{h}</th>
            )}
          </tr></thead>
          <tbody>
            {lista.map(b => (
              <tr key={b.id} className="cursor-pointer">
                <td className="px-5 text-[11px] text-gray-400 font-mono">{b.id}</td>
                <td className="px-5 text-[12px] text-gray-700 max-w-[220px]"><span className="truncate block">{b.desc}</span></td>
                <td className="px-5 text-[13px] font-bold text-gray-900">{b.valor}</td>
                <td className="px-5 text-[12px] text-gray-500">{b.emissao}</td>
                <td className="px-5 text-[12px] text-gray-600 font-medium">{b.venc}</td>
                <td className="px-5">
                  <span className={`badge ${b.tipo === 'receber' ? 'badge-teal' : 'badge-gray'}`}>
                    {b.tipo === 'receber' ? 'Receber' : 'Pagar'}
                  </span>
                </td>
                <td className="px-5">
                  <span className={`badge ${
                    b.status === 'pago' ? 'badge-green' :
                    b.status === 'vencido' ? 'badge-red' : 'badge-blue'
                  }`}>{b.status}</span>
                </td>
                <td className="px-5">
                  <button className="btn-outline text-[11px] px-3 py-1">Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal novo boleto */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-[15px] font-bold text-gray-900">Emitir Novo Boleto</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Descrição / Sacado', placeholder: 'Ex: Mensalidade cliente...', type: 'text' },
                { label: 'Valor (R$)',          placeholder: '0,00',                        type: 'number' },
                { label: 'Vencimento',          placeholder: '',                            type: 'date'   },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    className="input-premium w-full px-3 py-2.5 text-[13px]" />
                </div>
              ))}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Tipo</label>
                <div className="flex gap-2">
                  {['A Receber','A Pagar'].map(t => (
                    <button key={t} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-[12px] font-semibold text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-all">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setModal(false)} className="btn-outline flex-1 py-2.5">Cancelar</button>
              <button className="btn-black flex-1 justify-center py-2.5">Emitir Boleto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
