'use client';

import { useEffect, useMemo, useState } from 'react';
import { Filter, Clock3, MapPin, Monitor, Smartphone, ShieldCheck, UserRound } from 'lucide-react';
import { request, type PlatformBillingAuditLog } from '@/app/lib/api';

const ACTION_LABELS: Record<string, string> = {
  LOGIN_FAILED: 'Login negado',
  PASSWORD_CHANGED: 'Senha alterada',
  PASSWORD_RESET_REQUESTED: 'Solicitou reset de senha',
  PASSWORD_RESET_COMPLETED: 'Reset de senha concluido',
  EMPLOYEE_PASSWORD_RESET_BY_ADMIN: 'Senha redefinida pelo administrador',
  PRIVACY_TERMS_ACCEPTED: 'Aceitou os termos de uso',
  COMPANY_CREATED: 'Empresa criada',
  COMPANY_UPDATED: 'Empresa atualizada',
  COMPANY_ARCHIVED: 'Empresa arquivada',
  GHOST_MODE_STARTED: 'Acesso de suporte iniciado',
  BILLING_ONBOARDING_PENDING: 'Cobranca pendente',
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

export default function AuditPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [logs, setLogs] = useState<PlatformBillingAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    request<any[]>('/platform/companies')
      .then(setCompanies)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!companyId) {
      setLogs([]);
      return;
    }

    setLoading(true);
    setError('');
    request<PlatformBillingAuditLog[]>(`/platform/companies/${companyId}/audit-logs`)
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId]);

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

  const summary = useMemo(() => {
    const total = logs.length;
    const failures = logs.filter((log) => String(log.action).includes('FAILED')).length;
    const passwordChanges = logs.filter((log) => String(log.action).includes('PASSWORD')).length;
    const terms = logs.filter((log) => String(log.action).includes('TERMS')).length;
    const deviceMobile = logs.filter((log) => /Android|iPhone|iPad|Mobile/i.test(log.userAgent || '')).length;
    const deviceDesktop = total - deviceMobile;
    const lastAccess = logs[0]?.createdAt ? new Date(logs[0].createdAt).toLocaleString('pt-BR') : 'Sem registros';
    return { total, failures, passwordChanges, terms, deviceMobile, deviceDesktop, lastAccess };
  }, [logs]);

  const actionOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs],
  );

  return (
    <div className="space-y-5">
      <header className="page-header items-center">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Auditoria</p>
          <h2 className="text-2xl font-black text-slate-950">Linha do tempo de acessos e eventos</h2>
          <p className="text-sm font-medium text-slate-500">
            Resumo legivel para gestores, com data, localizacao, dispositivo e evento traduzido.
          </p>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total de eventos</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{summary.total}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Falhas</p>
          <p className="mt-2 text-2xl font-black text-rose-600">{summary.failures}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Trocas de senha</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{summary.passwordChanges}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Termos aceitos</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{summary.terms}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Celular</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{summary.deviceMobile}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ultimo acesso</p>
          <p className="mt-2 text-xs font-bold text-slate-700">{summary.lastAccess}</p>
        </div>
      </section>

      <section className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, evento, IP ou dispositivo"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-10 text-sm outline-none focus:border-teal-500"
            />
          </label>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
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
        </div>
      </section>

      {error && <p className="rounded-[14px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {loading && <p className="rounded-[14px] border border-slate-200 bg-white p-4 text-sm text-slate-500">Carregando eventos...</p>}

      <section className="space-y-3">
        {filteredLogs.length === 0 && !loading ? (
          <div className="rounded-[16px] border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Nenhum evento encontrado para os filtros selecionados.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <article key={log.id} className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-black text-teal-700">
                      <ShieldCheck size={12} />
                      {translateAction(log.action)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                  <h3 className="text-base font-black text-slate-950">{formatActor(log)}</h3>
                  <p className="text-sm text-slate-600">{log.entity || 'Evento de sistema'}</p>
                </div>

                <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <MapPin size={14} className="text-teal-600" />
                    <span>{formatIp(log.ipAddress)}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    {/Mobile|Android|iPhone|iPad/i.test(log.userAgent || '') ? (
                      <Smartphone size={14} className="text-teal-600" />
                    ) : (
                      <Monitor size={14} className="text-teal-600" />
                    )}
                    <span>{/Mobile|Android|iPhone|iPad/i.test(log.userAgent || '') ? 'Dispositivo mobile' : 'Computador'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Entidade</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{log.entity || '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Usuario</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{log.user?.name || log.user?.email || 'Sistema'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Origem</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{log.userAgent || 'Nao informado'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Dados</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {log.metadata && typeof log.metadata === 'object' ? 'Registrado com metadados' : 'Sem metadados'}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
