'use client';

import { TrendingUp, Users, AlertCircle, CheckCircle2, DollarSign, Activity, FileText } from 'lucide-react';

export default function PlatformDashboardPage() {
  const badgeColors: any = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Central de Operações</h2>
          <p className="text-sm text-slate-500">Visão consolidada da plataforma</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Recebido no mês" value="R$ 142.050,00" icon={<DollarSign size={20} className="text-emerald-600" />} trend="+12.5%" />
        <Card title="MRR (Receita Recorrente)" value="R$ 84.300,00" icon={<TrendingUp size={20} className="text-blue-600" />} trend="+5.2%" />
        <Card title="Empresas Ativas" value="1.248" icon={<Users size={20} className="text-indigo-600" />} trend="+24 esta semana" />
        <Card title="Inadimplência" value="2.4%" icon={<AlertCircle size={20} className="text-rose-600" />} trend="-0.5%" trendDown />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Activity size={16} /> Volume Transacional</h3>
          </div>
          <div className="h-56 w-full rounded-xl bg-slate-50 border border-slate-100 flex items-end justify-between p-4 px-6 gap-2">
            {[40, 60, 45, 80, 55, 90, 75].map((h, i) => (
              <div key={i} className="w-full bg-blue-100 rounded-t-md relative group hover:bg-blue-200 transition-colors" style={{ height: `${h}%` }}>
                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {h * 123} tx
                 </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-400 px-2 uppercase font-medium tracking-wider">
            <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><CheckCircle2 size={16} /> Status dos Serviços (Core)</h3>
          </div>
          <div className="space-y-4 flex-1 mt-2">
            <StatusRow label="API Principal" status="Operacional" color="emerald" />
            <StatusRow label="Emissão de Notas (NF-e)" status="Lentidão" color="amber" />
            <StatusRow label="Processamento de Pix" status="Operacional" color="emerald" />
            <StatusRow label="WhatsApp (Mensageria)" status="Operacional" color="emerald" />
            <StatusRow label="Relatórios Financeiros" status="Manutenção" color="rose" />
          </div>
        </section>
      </div>
      
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><FileText size={16} /> Últimas Operações Relevantes</h3>
          <button className="text-xs text-blue-600 font-medium hover:underline">Ver todas</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-500 uppercase tracking-wider bg-white">
                <th className="p-3 pl-0">Data/Hora</th>
                <th className="p-3">Operação</th>
                <th className="p-3">Empresa</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3 pr-0 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { time: 'Hoje, 14:32', op: 'Pagamento Pix Recebido', company: 'Tech Corp SA', val: 'R$ 2.450,00', status: 'Concluído', color: 'emerald' },
                { time: 'Hoje, 11:15', op: 'Assinatura Renovada (PRO)', company: 'Gama Services', val: 'R$ 890,00', status: 'Concluído', color: 'emerald' },
                { time: 'Ontem, 16:45', op: 'Estorno Solicitado', company: 'Lojas Delta', val: '- R$ 450,00', status: 'Em Análise', color: 'amber' },
                { time: 'Ontem, 09:10', op: 'Pagamento Boleto Atrasado', company: 'Alpha LLC', val: 'R$ 1.200,00', status: 'Pendente', color: 'rose' },
              ].map((row, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 text-sm text-slate-700">
                  <td className="p-3 pl-0 text-slate-400 text-xs">{row.time}</td>
                  <td className="p-3 font-medium text-slate-900">{row.op}</td>
                  <td className="p-3 text-slate-600">{row.company}</td>
                  <td className="p-3 text-right font-medium">{row.val}</td>
                  <td className="p-3 pr-0 text-right">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeColors[row.color]}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({ title, value, icon, trend, trendDown = false }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center">
        <span className={`text-xs font-bold ${trendDown ? 'text-rose-600' : 'text-emerald-600'}`}>
          {trend}
        </span>
        <span className="text-xs text-slate-400 ml-1.5">vs mês anterior</span>
      </div>
    </div>
  );
}

function StatusRow({ label, status, color }: any) {
  const badgeColors: any = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${badgeColors[color]}`}>
        {status}
      </span>
    </div>
  );
}
