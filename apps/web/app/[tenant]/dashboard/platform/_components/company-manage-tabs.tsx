'use client';

import { Database } from 'lucide-react';
import { isFeatureEnabled } from '@/app/lib/feature-flags';

/** Módulos liberados para a empresa (marcar/desmarcar). */
export function ModulesTab({ activeModules, onChange }: { activeModules: string[]; onChange: (modules: string[]) => void }) {
  return (
    <div className="rounded-[10px] border border-slate-100 bg-white p-5 shadow-sm">
      <label className="mb-4 block text-[11px] font-black uppercase tracking-wider text-slate-500">Módulos Liberados</label>
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: 'employees', label: 'Funcionários' },
          { id: 'time-track', label: 'Controle de Ponto' },
          { id: 'vacations', label: 'Gestão de Férias' },
          { id: 'management', label: 'Painel de Gestão' },
          { id: 'recruitment', label: 'Vagas e recrutamento' },
          ...(isFeatureEnabled('communication') ? [{ id: 'whatsapp', label: 'Integração WhatsApp' }] : []),
        ].map(mod => (
          <label key={mod.id} className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700 p-2 rounded-[8px] hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600" checked={activeModules.includes(mod.id)} onChange={(e) => {
              if (e.target.checked) onChange([...activeModules, mod.id]);
              else onChange(activeModules.filter(id => id !== mod.id));
            }} />
            {mod.label}
          </label>
        ))}
      </div>
    </div>
  );
}

/** Vínculo da empresa com o cliente e a assinatura no provedor de pagamento. */
export function GatewayTab({ customerId, subscriptionId, onCustomerId, onSubscriptionId }: { customerId: string; subscriptionId: string; onCustomerId: (value: string) => void; onSubscriptionId: (value: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0030B9] text-white">
            <Database size={16} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900">Integração Asaas</h4>
            <p className="text-[11px] text-slate-500">Vincule a empresa ao cliente e assinatura do Asaas</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Customer ID (Asaas)</label>
            <input aria-label="ID do cliente no Asaas" type="text" placeholder="cus_00000..." value={customerId} onChange={(e) => onCustomerId(e.target.value)} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-medium outline-none focus:border-teal-500 font-mono" />
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Subscription ID (Asaas)</label>
            <input aria-label="ID da assinatura no Asaas" type="text" placeholder="sub_00000..." value={subscriptionId} onChange={(e) => onSubscriptionId(e.target.value)} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-medium outline-none focus:border-teal-500 font-mono" />
          </div>
        </div>

        {(customerId || subscriptionId) && (
          <div className="mt-4 flex gap-2">
            {customerId && (
              <a href={`https://www.asaas.com/customer/view/${customerId}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#0030B9] hover:underline">
                Abrir Cliente no Asaas
              </a>
            )}
            {customerId && subscriptionId && <span className="text-slate-300">|</span>}
            {subscriptionId && (
              <a href={`https://www.asaas.com/subscription/view/${subscriptionId}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#0030B9] hover:underline">
                Abrir Assinatura no Asaas
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Anotações internas sobre o cliente (histórico de negociação, alinhamentos). */
export function NotesTab({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="rounded-[10px] border border-slate-100 bg-white p-5 shadow-sm flex flex-col h-full">
      <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Anotações Internas (Somente DEV/COMERCIAL)</label>
      <textarea aria-label="Observações internas sobre o cliente"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Registre aqui o histórico de negociação, alinhamentos e observações técnicas sobre o cliente..."
        className="w-full flex-1 min-h-[160px] rounded-[8px] border border-slate-200 p-3 text-sm outline-none focus:border-teal-500 resize-y"
      />
    </div>
  );
}
