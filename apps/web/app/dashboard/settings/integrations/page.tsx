import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  KeyRound,
  Mail,
  Plug,
  Send,
  Settings2,
  Smartphone,
  WalletCards,
} from 'lucide-react';

const integrations = [
  { name: 'OPENAI', slug: 'openai', status: 'pending', icon: KeyRound },
  { name: 'WHATSAPP', slug: 'whatsapp', status: 'pending', icon: Smartphone },
  { name: 'MERCADO PAGO', slug: 'mercado_pago', status: 'inactive', icon: WalletCards },
  { name: 'STRIPE', slug: 'stripe', status: 'inactive', icon: WalletCards },
  { name: 'ASAAS', slug: 'asaas', status: 'inactive', icon: WalletCards },
  { name: 'SENDGRID', slug: 'sendgrid', status: 'inactive', icon: Send },
  { name: 'SMTP', slug: 'smtp', status: 'inactive', icon: Mail },
  { name: 'GOOGLE CALENDAR', slug: 'google_calendar', status: 'inactive', icon: CalendarDays },
  { name: 'WEBHOOK', slug: 'webhook', status: 'inactive', icon: Plug },
];

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="crystal-dark hero-crystal relative overflow-hidden rounded-[16px] px-6 py-6 text-white">
        <div className="absolute right-0 top-0 h-48 w-72 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.34),transparent_56%)]" />
        <div className="absolute right-32 top-[-56px] h-52 w-52 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.25),transparent_58%)]" />
        <div className="relative flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Control plane</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Integracoes</h2>
            <p className="mt-2 max-w-xl text-xs text-slate-300">Conecte provedores externos sem expor tokens no frontend.</p>
          </div>
          <span className="rounded-lg border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-[10px] font-black text-teal-100">
            Supabase ativo
          </span>
        </div>
      </section>

      <div className="notice-card flex items-center gap-2 rounded-[14px] border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
        <AlertCircle size={14} className="shrink-0 text-amber-600" />
        Tokens e senhas nunca sao exibidos. Ao salvar uma credencial, ela substitui a anterior e fica disponivel apenas para servicos backend.
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const isPending = integration.status === 'pending';

          return (
            <article key={integration.slug} className="settings-card rounded-[15px] border border-slate-300 bg-white">
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="settings-icon">
                    <Icon size={15} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-950">{integration.name}</h3>
                    <p className="mt-1 text-[11px] text-slate-500">{integration.slug}</p>
                  </div>
                </div>
                <StatusBadge status={integration.status} />
              </div>

              <div className="border-t border-slate-100 px-5 py-4">
                <div className="mb-4 flex items-center gap-2 text-[11px] text-slate-500">
                  {isPending ? <AlertCircle size={12} className="text-amber-500" /> : <CheckCircle2 size={12} className="text-slate-300" />}
                  Sem sincronizacao
                </div>
                <button className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                  <Settings2 size={12} />
                  Configurar
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isPending = status === 'pending';

  return (
    <span
      className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${
        isPending ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
      }`}
    >
      {status}
    </span>
  );
}
