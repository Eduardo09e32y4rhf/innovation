"use client";
import { useState } from 'react';
import { Calculator, FileText, Percent, DollarSign, RefreshCw } from 'lucide-react';

/* ── Calculadora financeira ── */
function Calculadora() {
  const [tipo, setTipo] = useState<'juros'|'desconto'|'parcelamento'>('juros');
  const [vals, setVals] = useState({ valor: '', taxa: '', periodo: '', entrada: '' });
  const [resultado, setResultado] = useState<null | Record<string, string>>(null);

  const calcular = () => {
    const v = parseFloat(vals.valor.replace(',', '.')) || 0;
    const t = parseFloat(vals.taxa.replace(',', '.')) || 0;
    const p = parseInt(vals.periodo) || 1;
    const e = parseFloat(vals.entrada.replace(',', '.')) || 0;

    if (tipo === 'juros') {
      const juros = v * Math.pow(1 + t / 100, p) - v;
      const total = v + juros;
      setResultado({
        'Valor Futuro': `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        'Total de Juros': `R$ ${juros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        'Taxa Efetiva': `${(Math.pow(1 + t / 100, p) - 1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%`,
      });
    } else if (tipo === 'desconto') {
      const desc = v * (t / 100);
      const liq  = v - desc;
      setResultado({
        'Valor com Desconto': `R$ ${liq.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        'Desconto Aplicado':  `R$ ${desc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        'Economia':           `${t.toFixed(1)}% (R$ ${desc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
      });
    } else {
      const restante   = v - e;
      const parcela    = (restante * (t / 100)) / (1 - Math.pow(1 + t / 100, -p));
      const totalPago  = e + parcela * p;
      const totalJuros = totalPago - v;
      setResultado({
        'Valor da Parcela': `R$ ${parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        'Total Pago':       `R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        'Total de Juros':   `R$ ${totalJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      });
    }
  };

  return (
    <div className="dash-card p-5 h-full">
      <div className="flex items-center gap-2 mb-5">
        <Calculator size={16} className="text-gray-900" strokeWidth={2} />
        <h3 className="text-[14px] font-bold text-gray-900">Calculadora Financeira</h3>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-5">
        {([['juros','Juros Comp.'],['desconto','Desconto'],['parcelamento','Parcelamento']] as const).map(([k,l]) => (
          <button key={k} onClick={() => { setTipo(k); setResultado(null); }}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
              tipo === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>{l}</button>
        ))}
      </div>

      <div className="space-y-3">
        {[
          { key: 'valor',   label: 'Valor Principal (R$)',            show: true },
          { key: 'taxa',    label: tipo === 'desconto' ? 'Taxa de Desconto (%)' : 'Taxa de Juros (% a.m.)', show: true },
          { key: 'periodo', label: tipo === 'desconto' ? null : (tipo === 'juros' ? 'Período (meses)' : 'Nº de Parcelas'), show: tipo !== 'desconto' },
          { key: 'entrada', label: 'Entrada (R$)', show: tipo === 'parcelamento' },
        ].filter(f => f.show && f.label).map(f => (
          <div key={f.key}>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{f.label}</label>
            <input
              type="number"
              value={vals[f.key as keyof typeof vals]}
              onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
              className="input-premium w-full px-3 py-2.5 text-[13px]"
              placeholder="0"
            />
          </div>
        ))}

        <button onClick={calcular} className="btn-black w-full justify-center py-2.5 mt-2">
          <RefreshCw size={13} strokeWidth={2.2} />
          Calcular
        </button>
      </div>

      {resultado && (
        <div className="mt-5 p-4 rounded-xl bg-gray-900 space-y-2.5">
          {Object.entries(resultado).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">{k}</span>
              <span className="text-[14px] font-bold text-white">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Propostas ── */
const propostas = [
  { id: 'P001', cliente: 'Alpha Tech Ltda',   valor: 'R$ 48.000,00', tipo: 'Anual',      status: 'enviada',   data: '05/05/2026' },
  { id: 'P002', cliente: 'Beta Soluções',     valor: 'R$ 12.800,00', tipo: 'Mensal',     status: 'aprovada',  data: '02/05/2026' },
  { id: 'P003', cliente: 'Gama Indústria',    valor: 'R$ 28.500,00', tipo: 'Semestral',  status: 'negociando',data: '30/04/2026' },
  { id: 'P004', cliente: 'Delta Comércio',    valor: 'R$ 9.600,00',  tipo: 'Mensal',     status: 'rascunho',  data: '28/04/2026' },
];

export default function PropostasPage() {
  const [novaPropostaModal, setNovaPropostaModal] = useState(false);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Propostas Enviadas',  val: '3',           sub: 'aguardando resposta' },
          { label: 'Taxa de Conversão',   val: '33%',         sub: '1 de 3 aprovadas' },
          { label: 'Valor em Negociação', val: 'R$ 88.500',   sub: '3 propostas ativas' },
          { label: 'Ticket Médio',        val: 'R$ 24.725',   sub: 'últimos 30 dias' },
        ].map(k => (
          <div key={k.label} className="dash-card p-5">
            <p className="text-[11px] font-medium text-gray-500 mb-3">{k.label}</p>
            <p className="text-[24px] font-black text-gray-900 leading-none tracking-tight">{k.val}</p>
            <p className="text-[11px] text-gray-400 mt-1.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-5">
        {/* Propostas list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-gray-900">Propostas Comerciais</h3>
            <button onClick={() => setNovaPropostaModal(true)} className="btn-black">
              <FileText size={13} strokeWidth={2.2} /> Nova Proposta
            </button>
          </div>

          <div className="dash-card overflow-hidden">
            <table className="table-premium w-full">
              <thead><tr>
                {['ID','Cliente','Valor','Tipo','Data','Status',''].map(h =>
                  <th key={h} className="px-5">{h}</th>
                )}
              </tr></thead>
              <tbody>
                {propostas.map(p => (
                  <tr key={p.id} className="cursor-pointer">
                    <td className="px-5 text-[11px] text-gray-400 font-mono">{p.id}</td>
                    <td className="px-5 text-[12px] font-semibold text-gray-900">{p.cliente}</td>
                    <td className="px-5 text-[13px] font-bold text-gray-900">{p.valor}</td>
                    <td className="px-5 text-[12px] text-gray-500">{p.tipo}</td>
                    <td className="px-5 text-[12px] text-gray-400">{p.data}</td>
                    <td className="px-5">
                      <span className={`badge ${
                        p.status === 'aprovada'   ? 'badge-green' :
                        p.status === 'enviada'    ? 'badge-blue'  :
                        p.status === 'negociando' ? 'badge-amber' : 'badge-gray'
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-5">
                      <button className="btn-outline text-[11px] px-3 py-1">Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Template cards */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Templates de Proposta</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'SaaS Mensal',    icon: DollarSign, desc: 'Plano recorrente mensal' },
                { label: 'Projeto Único',  icon: FileText,   desc: 'Entrega pontual' },
                { label: 'Retainer',       icon: Percent,    desc: 'Contrato de horas' },
              ].map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.label} className="dash-card p-4 text-left hover:border-gray-900 transition-all group">
                    <Icon size={18} className="text-gray-400 group-hover:text-gray-900 mb-2 transition-colors" strokeWidth={1.8} />
                    <p className="text-[12px] font-semibold text-gray-900">{t.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Calculadora */}
        <Calculadora />
      </div>
    </div>
  );
}
