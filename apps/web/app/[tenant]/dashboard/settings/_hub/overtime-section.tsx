'use client';

import { Landmark, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { request } from '@/app/lib/api';
import { cardClass, errorText, inputClass } from './types';

type Policy = 'PAYMENT' | 'BANK';
interface OvertimePolicy { policy: Policy; validityMonths: number }

const OPTIONS: { value: Policy; title: string; text: string; icon: typeof Wallet }[] = [
  { value: 'PAYMENT', title: 'Pagar na folha', text: 'A hora extra autorizada é paga no salário do mês. Não há banco de horas e o funcionário não solicita folga de banco.', icon: Wallet },
  { value: 'BANK', title: 'Banco de horas', text: 'A hora extra autorizada vira saldo no banco, que o funcionário pode usar em folga dentro do prazo de validade.', icon: Landmark },
];

export function OvertimeSection() {
  const current = useQuery(() => request<OvertimePolicy>('/time-closing/overtime-policy'), []);
  const [policy, setPolicy] = useState<Policy>('PAYMENT');
  const [months, setMonths] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (current.data) { setPolicy(current.data.policy); setMonths(current.data.validityMonths); }
  }, [current.data]);

  const changed = Boolean(current.data) && (current.data!.policy !== policy || current.data!.validityMonths !== months);

  async function save() {
    setSaving(true);
    try {
      await request('/time-closing/overtime-policy', { method: 'PUT', body: { policy, validityMonths: months } });
      toast.success('Política de hora extra salva. Vale para os próximos lançamentos.');
      current.refetch();
    } catch (cause) {
      toast.error(errorText(cause, 'Não foi possível salvar a política.'));
    } finally { setSaving(false); }
  }

  if (current.loading && !current.data) return <LoadingState label="Carregando política…" />;
  if (current.error) return <ErrorState message={current.error} onRetry={current.refetch} />;

  return (
    <section className={`${cardClass} space-y-5`}>
      <header>
        <h2 className="text-lg font-bold text-fg">Hora extra e banco de horas</h2>
        <p className="mt-1 text-sm text-fg-sub">Define o que acontece com a hora extra autorizada. A mudança vale para os próximos lançamentos; o que já foi lançado não é alterado.</p>
      </header>

      <div role="radiogroup" aria-label="Política de hora extra" className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = policy === option.value;
          return (
            <button key={option.value} type="button" role="radio" aria-checked={active} onClick={() => setPolicy(option.value)}
              className={`flex min-h-11 items-start gap-3 rounded-xl border p-4 text-left transition ${active ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-200' : 'border-border hover:bg-bg-sub'}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-purple-600 text-white' : 'bg-bg-sub text-fg-sub'}`}><Icon size={18} aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block text-sm font-bold text-fg">{option.title}</span><span className="mt-0.5 block text-xs text-fg-sub">{option.text}</span></span>
            </button>
          );
        })}
      </div>

      {policy === 'BANK' && (
        <label className="block max-w-xs text-sm font-medium">Validade do banco (meses)
          <input type="number" min={1} max={12} className={inputClass} value={months} onChange={(event) => setMonths(Math.min(12, Math.max(1, Number(event.target.value) || 1)))} />
          <span className="mt-1 block text-xs font-normal text-fg-sub">Horas mais antigas que isso deixam de contar no saldo. Padrão: 3 meses.</span>
        </label>
      )}

      <p className="rounded-lg border border-border bg-bg-sub p-3 text-xs text-fg-sub">
        Em qualquer política: hora extra não compensa atraso nem saída antecipada sem autorização do gestor, RH, ADM ou DEV; DSR, atestado e folga extra nunca entram como saldo negativo.
      </p>

      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={!changed || saving} isLoading={saving}>Salvar política</Button>
      </div>
    </section>
  );
}
