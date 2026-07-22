'use client';

import { useEffect, useState } from 'react';
import { request } from '@/app/lib/api';

export default function AuditPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { request<any[]>('/platform/companies').then(setCompanies).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (!companyId) { setLogs([]); return; } request<any[]>(`/platform/companies/${companyId}/audit-logs`).then(setLogs).catch((e) => setError(e.message)); }, [companyId]);
  return <div className="space-y-4"><select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="h-11 w-full max-w-md rounded-xl border bg-white px-3"><option value="">Selecione uma empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>{error && <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}<div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[760px] w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-4">Data</th><th className="p-4">Ação</th><th className="p-4">Entidade</th><th className="p-4">Usuário</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-b"><td className="p-4">{new Date(log.createdAt).toLocaleString('pt-BR')}</td><td className="p-4 font-bold">{log.action}</td><td className="p-4">{log.entity}</td><td className="p-4">{log.user?.name || log.user?.email || 'Sistema'}</td></tr>)}</tbody></table></div></div>;
}
