'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Filter, Clock3, MapPin, Monitor, Smartphone, ShieldCheck,
  ChevronLeft, ChevronRight, Download, AlertCircle, RefreshCw,
} from 'lucide-react';
import { request, type PlatformBillingAuditLog } from '@/app/lib/api';

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  LOGIN_FAILED: 'Login negado',
  PASSWORD_CHANGED: 'Senha alterada',
  PASSWORD_RESET_REQUESTED: 'Solicitou reset de senha',
  PASSWORD_RESET_COMPLETED: 'Reset de senha concluído',
  EMPLOYEE_PASSWORD_RESET_BY_ADMIN: 'Senha redefinida pelo administrador',
  PRIVACY_TERMS_ACCEPTED: 'Aceitou os termos de uso',
  COMPANY_CREATED: 'Empresa criada',
  COMPANY_UPDATED: 'Empresa atualizada',
  COMPANY_ARCHIVED: 'Empresa arquivada',
  GHOST_MODE_STARTED: 'Acesso de suporte iniciado',
  BILLING_ONBOARDING_PENDING: 'Cobrança pendente',
  BILLING_ONBOARDING_PAYMENT_CREATED: 'Pagamento de onboarding criado',
};

function translateAction(action: string) {
  return ACTION_LABELS[action] || action.replace(/_/g, ' ').toLowerCase();
}

function formatActor(log: PlatformBillingAuditLog) {
  const metadataActor = (log.metadata as Record<string, unknown> | null | undefined)?.actorEmail;
  return log.user?.name || log.user?.email || (typeof metadataActor === 'string' ? metadataActor : null) || 'Sistema';
}

function formatIp(ip?: string | null) {
  return ip || 'Localização indisponível';
}

function isMobile(userAgent?: string | null) {
  return /Android|iPhone|iPad|Mobile/i.test(userAgent || '');
}

function exportCsv(rows: PlatformBillingAuditLog[]) {
  const headers = ['Data', 'Ação', 'Ator', 'Entidade', 'IP', 'Dispositivo', 'Metadados'];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((log) =>
      [
        new Date(log.createdAt).toLocaleString('pt-BR'),
        translateAction(log.action),
        formatActor(log),
        log.entity || '-',
        formatIp(log.ipAddress),
        isMobile(log.userAgent) ? 'Mobile' : 'Desktop',
        log.metadata ? JSON.stringify(log.metadata) : '-',
      ]
        .map(escape)
        .join(',')
    ),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AuditPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [logs, setLogs] = useState<PlatformBillingAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    request<any[]>('/platform/companies')
      .then(setCompanies)
      .catch((e) => setError(e.message));
  }, []);

  const loadLogs = (cid: string) => {
    if (!cid) { setLogs([]); return; }
    setLoading(true);
    setError('');
    setPage(1);
    request<PlatformBillingAuditLog[]>(`/platform/companies/${cid}/audit-logs`)
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLogs(companyId); }, [companyId]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (type && log.action !== type) return false;
      if (!q) return true;
      return [
        translateAction(log.action),
        log.action,
        log.entity,
        formatActor(log),
        formatIp(log.ipAddress),
        log.userAgent || '',
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [logs, search, type]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(page, totalPages);
  const pageLogs = filteredLogs.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  const summary = useMemo(() => {
    const total = logs.length;
    const failures = logs.filter((log) => String(log.action).includes('FAILED')).length;
    const passwordChanges = logs.filter((log) => String(log.action).includes('PASSWORD')).length;
    const terms = logs.filter((log) => String(log.action).includes('TERMS')).length;
    const deviceMobile = logs.filter((log) => isMobile(log.userAgent)).length;
    const deviceDesktop = total - deviceMobile;
    const lastAccess = logs[0]?.createdAt ? new Date(logs[0].createdAt).toLocaleString('pt-BR') : 'Sem registros';
    return { total, failures, passwordChanges, terms, deviceMobile, deviceDesktop, lastAccess };
  }, [logs]);

  const actionOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs],
  );

  const isFiltered = !!search || !!type;

  return (
    <div className="space-y-5">
      <header className="page-header items-center">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Auditoria</p>
          <h2 className="text-2xl font-black text-slate-950">Linha do tempo de acessos e eventos</h2>
          <p className="text-sm font-medium text-slate-500">
            Resumo legível para gestores, com data, localização, dispositivo e evento traduzido.
          </p>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Total de eventos', value: summary.total, cls: 'text-slate-950' },
          { label: 'Falhas', value: summary.failures, cls: 'text-rose-600' },
          { label: 'Trocas de senha', value: summary.passwordChanges, cls: 'text-slate-950' },
          { label: 'Termos aceitos', value: summary.terms, cls: 'text-slate-950' },
          { label: 'Celular', value: summary.deviceMobile, cls: 'text-slate-950' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className={`mt-2 text-2xl font-black ${cls}`}>{value}</p>
          </div>
        ))}
        <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Último acesso</p>
          <p className="mt-2 text-xs font-bold text-slate-700">{summary.lastAccess}</p>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative block">
            <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nome, evento, IP ou dispositivo"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-10 text-sm outline-none focus:border-teal-500"
            />
          </label>

          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
          >
            <option value="">Todos os eventos</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {translateAction(action)}
              </option>
            ))}
          </select>

          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
          >
            <option value="">Selecione uma empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          {logs.length > 0 && (
            <button
              onClick={() => exportCsv(filteredLogs)}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-colors"
              title="Exportar dados visíveis como CSV"
            >
              <Download size={15} />
              Exportar CSV
            </button>
          )}
        </div>

        {logs.length > 0 && (
          <p className="mt-2 text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <AlertCircle size={11} />
            {isFiltered
              ? `Exibindo ${filteredLogs.length} de ${logs.length} eventos (filtro ativo). O export reflete apenas os eventos visíveis.`
              : `${logs.length} eventos carregados. O export reflete o que está na tela.`}
          </p>
        )}
      </section>

      {/* Error / Loading */}
      {error && (
        <div className="flex items-center gap-3 rounded-[14px] border border-rose-200 bg-rose-50 p-4">
          <AlertCircle size={16} className="shrink-0 text-rose-500" />
          <p className="text-sm text-rose-700">{error}</p>
          {companyId && (
            <button onClick={() => loadLogs(companyId)} className="ml-auto flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline">
              <RefreshCw size={12} /> Tentar novamente
            </button>
          )}
        </div>
      )}
      {loading && (
        <div className="rounded-[14px] border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            <p className="text-sm text-slate-500">Carregando eventos de auditoria...</p>
          </div>
        </div>
      )}

      {/* Table */}
      <section className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
        {!companyId && !loading && (
          <div className="p-10 text-center text-sm text-slate-500">
            Selecione uma empresa para visualizar os logs de auditoria.
          </div>
        )}

        {companyId && !loading && filteredLogs.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-500">
            Nenhum evento encontrado para os filtros selecionados.
          </div>
        )}

        {pageLogs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Ator</th>
                  <th className="px-4 py-3">Entidade</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {pageLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-50 text-xs last:border-0 hover:bg-slate-50/60 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock3 size={11} className="text-slate-300" />
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${
                        log.action.includes('FAILED')
                          ? 'bg-rose-50 text-rose-700'
                          : log.action.includes('PASSWORD')
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-teal-50 text-teal-700'
                      }`}>
                        <ShieldCheck size={10} />
                        {translateAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatActor(log)}</td>
                    <td className="px-4 py-3 text-slate-600">{log.entity || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-teal-500" />
                        {formatIp(log.ipAddress)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <span className="flex items-center gap-1">
                        {isMobile(log.userAgent)
                          ? <><Smartphone size={12} className="text-teal-500" /> Mobile</>
                          : <><Monitor size={12} className="text-teal-500" /> Desktop</>
                        }
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {filteredLogs.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">
              Página {safeCurrentPage} de {totalPages} — {filteredLogs.length} eventos
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(safeCurrentPage - 2, totalPages - 4));
                const pg = start + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`flex h-8 w-8 items-center justify-center rounded-[8px] border text-xs font-bold transition-colors ${
                      pg === safeCurrentPage
                        ? 'border-teal-500 bg-teal-500 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700'
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
