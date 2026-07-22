'use client';

import { useEffect, useState } from 'react';
import { request } from '@/app/lib/api';

export default function SubscriptionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { request<any[]>('/platform/companies').then(setItems).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>;
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-[760px] w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-4">Empresa</th><th className="p-4">Plano</th><th className="p-4">Status</th><th className="p-4">Licenças</th><th className="p-4">Próximo vencimento</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-4 font-bold">{item.name}</td><td className="p-4">{item.platformPlan?.name || 'Sem plano'}</td><td className="p-4">{item.subscription?.status || item.billingStatus}</td><td className="p-4">{item.subscription?.seatQuantity ?? 0}</td><td className="p-4">{item.subscription?.nextDueDate ? new Date(item.subscription.nextDueDate).toLocaleDateString('pt-BR') : '—'}</td></tr>)}</tbody></table></div>;
}
