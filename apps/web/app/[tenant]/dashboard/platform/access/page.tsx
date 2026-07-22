'use client';

import { useEffect, useState } from 'react';
import { request } from '@/app/lib/api';

export default function AccessPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { request<any[]>('/platform/online-users').then(setItems).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>;
  return <div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[680px] w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-4">Usuário</th><th className="p-4">Empresa</th><th className="p-4">Perfil</th><th className="p-4">Última atividade</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id || index} className="border-b"><td className="p-4 font-bold">{item.name || item.email}</td><td className="p-4">{item.company?.name || item.companyName || '—'}</td><td className="p-4">{item.role}</td><td className="p-4">{item.lastActiveAt ? new Date(item.lastActiveAt).toLocaleString('pt-BR') : '—'}</td></tr>)}</tbody></table></div>;
}
