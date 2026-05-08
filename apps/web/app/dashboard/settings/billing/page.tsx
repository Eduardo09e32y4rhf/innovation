import { SettingsHero, SettingsPanel } from '../_components/settings-ui';

const plans = [
  { name: 'Starter', price: 'R$ 97.00', users: '3 usuarios', employees: '25 funcionarios', ai: '1000 mensagens IA' },
  { name: 'Growth', price: 'R$ 297.00', users: '10 usuarios', employees: '120 funcionarios', ai: '8000 mensagens IA', active: true },
  { name: 'Scale', price: 'R$ 697.00', users: '30 usuarios', employees: '500 funcionarios', ai: '30000 mensagens IA' },
];

export default function BillingSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <SettingsHero title="Plano e Assinatura" description="Plano atual, limites e historico de pagamentos." />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.name} className={`settings-card rounded-[16px] border bg-white p-5 ${plan.active ? 'border-slate-900' : 'border-slate-300'}`}>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-950">{plan.name}</h3>
                <p className="mt-1 text-xs text-slate-500">monthly</p>
              </div>
              {plan.active ? <span className="rounded-full bg-[#07111f] px-2 py-1 text-[9px] font-black text-white">active</span> : null}
            </div>
            <p className="mb-4 text-2xl font-black text-slate-950">{plan.price}</p>
            <div className="space-y-1 text-xs text-slate-600">
              <p>{plan.users}</p>
              <p>{plan.employees}</p>
              <p>{plan.ai}</p>
            </div>
            <button className={`mt-5 h-9 w-full rounded-[10px] text-xs font-black shadow-sm ${plan.active ? 'bg-slate-100 text-slate-700' : 'bg-[#07111f] text-white'}`}>
              Atualizar plano
            </button>
          </article>
        ))}
      </section>

      <SettingsPanel title="Historico de pagamentos">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="pb-3 font-bold">Valor</th>
              <th className="pb-3 font-bold">Status</th>
              <th className="pb-3 font-bold">Pago em</th>
              <th className="pb-3 font-bold">Fatura</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-200 text-xs text-slate-800">
              <td className="py-3">R$ 297.00</td>
              <td className="py-3"><span className="rounded-full bg-[#07111f] px-2 py-1 text-[10px] font-black text-white">paid</span></td>
              <td className="py-3">30/04/2026</td>
              <td className="py-3">-</td>
            </tr>
          </tbody>
        </table>
      </SettingsPanel>
    </div>
  );
}
