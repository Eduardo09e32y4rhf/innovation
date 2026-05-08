"use client";
import { useState } from 'react';
import { Plus, Search, ArrowUpCircle, ArrowDownCircle, X } from 'lucide-react';

const lancamentos = [
  { id: 'L001', desc: 'Mensalidade Plano Growth',    valor:  12800, tipo: 'receita',  cat: 'SaaS',         data: '07/05/2026', status: 'confirmado' },
  { id: 'L002', desc: 'Campanhas e automações',       valor: -2380,  tipo: 'despesa',  cat: 'Marketing',    data: '06/05/2026', status: 'confirmado' },
  { id: 'L003', desc: 'Setup de implantação',        valor:  5600,  tipo: 'receita',  cat: 'Serviços',     data: '05/05/2026', status: 'pendente'   },
  { id: 'L004', desc: 'Licença de software anual',   valor: -4200,  tipo: 'despesa',  cat: 'Tecnologia',   data: '04/05/2026', status: 'confirmado' },
  { id: 'L005', desc: 'Consultoria estratégica',     valor:  3500,  tipo: 'receita',  cat: 'Consultoria',  data: '03/05/2026', status: 'confirmado' },
  { id: 'L006', desc: 'Aluguel escritório',          valor: -4800,  tipo: 'despesa',  cat: 'Infraestrutura',data: '01/05/2026', status: 'confirmado' },
  { id: 'L007', desc: 'AWS Cloud Services',          valor: -1450,  tipo: 'despesa',  cat: 'Tecnologia',   data: '01/05/2026', status: 'agendado'   },
  { id: 'L008', desc: 'Venda licença adicional',     valor:  2200,  tipo: 'receita',  cat: 'SaaS',         data: '28/04/2026', status: 'confirmado' },
];

const categorias = ['SaaS','Serviços','Consultoria','Marketing','Tecnologia','Infraestrutura','Outros'];

export default function LancamentosPage() {
  const [filtroTipo, setFiltroTipo] = useState<'todos'|'receita'|'despesa'>('todos');
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);

  const lista = lancamentos.filter(l =>
    (filtroTipo === 'todos' || l.tipo === filtroTipo) &&
    l.desc.toLowerCase().includes(busca.toLowerCase())
  );

  const totalReceitas = lancamentos.filter(l => l.valor > 0).reduce((s, l) => s + l.valor, 0);
  const totalDespesas = lancamentos.filter(l => l.valor < 0).reduce((s, l) => s + l.valor, 0);
  const saldo = totalReceitas + totalDespesas;

  const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="dash-card p-5 border border-teal-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-gray-500">Total Entradas</p>
            <ArrowUpCircle size={18} className="text-teal-500" strokeWidth={1.8} />
          </div>
          <p className="text-[28px] font-black text-teal-600 leading-none">{fmt(totalReceitas)}</p>
          <p className="text-[11px] text-gray-400 mt-1.5">{lancamentos.filter(l => l.valor > 0).length} lançamentos</p>
        </div>
        <div className="dash-card p-5 border border-red-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-gray-500">Total Saídas</p>
            <ArrowDownCircle size={18} className="text-red-400" strokeWidth={1.8} />
          </div>
          <p className="text-[28px] font-black text-red-500 leading-none">{fmt(totalDespesas)}</p>
          <p className="text-[11px] text-gray-400 mt-1.5">{lancamentos.filter(l => l.valor < 0).length} lançamentos</p>
        </div>
        <div className="dash-card p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-gray-500">Resultado Líquido</p>
            <span className={`text-[11px] font-bold ${saldo >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
              {saldo >= 0 ? '▲ Positivo' : '▼ Negativo'}
            </span>
          </div>
          <p className={`text-[28px] font-black leading-none ${saldo >= 0 ? 'text-gray-900' : 'text-red-500'}`}>{fmt(saldo)}</p>
          <p className="text-[11px] text-gray-400 mt-1.5">margem {Math.round((saldo / totalReceitas) * 100)}%</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="search-box flex-1 max-w-xs">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input placeholder="Buscar lançamento..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          {(['todos','receita','despesa'] as const).map(f => (
            <button key={f} onClick={() => setFiltroTipo(f)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md capitalize transition-all ${
                filtroTipo === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}>{f === 'todos' ? 'Todos' : f === 'receita' ? 'Entradas' : 'Saídas'}</button>
          ))}
        </div>
        <button onClick={() => setModal(true)} className="btn-black ml-auto">
          <Plus size={13} strokeWidth={2.2} /> Novo Lançamento
        </button>
      </div>

      {/* Table */}
      <div className="dash-card overflow-hidden">
        <table className="table-premium w-full">
          <thead><tr>
            {['ID','Descrição','Valor','Categoria','Data','Status',''].map(h =>
              <th key={h} className="px-5">{h}</th>
            )}
          </tr></thead>
          <tbody>
            {lista.map(l => (
              <tr key={l.id} className="cursor-pointer">
                <td className="px-5 text-[11px] text-gray-400 font-mono">{l.id}</td>
                <td className="px-5 text-[12px] text-gray-800 font-medium">{l.desc}</td>
                <td className={`px-5 text-[13px] font-bold ${l.valor > 0 ? 'text-teal-600' : 'text-red-500'}`}>
                  {l.valor > 0 ? '+' : ''}{fmt(l.valor)}
                </td>
                <td className="px-5 text-[12px] text-gray-500">{l.cat}</td>
                <td className="px-5 text-[12px] text-gray-500">{l.data}</td>
                <td className="px-5">
                  <span className={`badge ${
                    l.status === 'confirmado' ? 'badge-green' :
                    l.status === 'agendado'   ? 'badge-blue'  : 'badge-amber'
                  }`}>{l.status}</span>
                </td>
                <td className="px-5">
                  <button className="btn-outline text-[11px] px-3 py-1">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-[15px] font-bold text-gray-900">Novo Lançamento</h3>
              <button onClick={() => setModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(['Entrada','Saída']).map(t => (
                  <button key={t} className={`py-3 rounded-xl border-2 text-[13px] font-bold transition-all ${
                    t === 'Entrada' ? 'border-teal-400 text-teal-600 bg-teal-50' : 'border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500'
                  }`}>{t}</button>
                ))}
              </div>
              {[
                { label: 'Descrição', placeholder: 'Ex: Mensalidade cliente...', type: 'text' },
                { label: 'Valor (R$)', placeholder: '0,00', type: 'number' },
                { label: 'Data', placeholder: '', type: 'date' },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} className="input-premium w-full px-3 py-2.5 text-[13px]" />
                </div>
              ))}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Categoria</label>
                <select className="input-premium w-full px-3 py-2.5 text-[13px]">
                  {categorias.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setModal(false)} className="btn-outline flex-1 py-2.5">Cancelar</button>
              <button className="btn-black flex-1 justify-center py-2.5">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
