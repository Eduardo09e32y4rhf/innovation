'use client';

import { useCallback, useEffect, useState } from 'react';
import { Receipt, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import api, { ApiError, type FaturasRolePermissions } from '@/app/lib/api';
import { PERMISSIONS_LABELS, type Permission } from '@/app/lib/permissions';

const ROLE_LABEL: Record<string, string> = {
  DEV: 'DEV / Super Admin', CEO: 'CEO', CONTABIL: 'Contador', COMERCIAL: 'Comercial', ADMIN: 'Administrador da empresa',
  RH: 'Recursos Humanos', GESTOR: 'Gestor', FUNCIONARIO: 'Funcionário', CONSULTA: 'Apenas consulta',
};

/** Define, por perfil, quem vê e faz o quê na aba Faturas. Usuários com permissões personalizadas continuam valendo por cima. */
export default function FaturasRolePermissions() {
  const [data, setData] = useState<FaturasRolePermissions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState('ADMIN');
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api.faturas.rolePermissions()); setError(null); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Não foi possível carregar as permissões de Faturas.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (error) return <p role="alert" className="text-sm text-rose-600">{error}</p>;
  if (!data) return <p role="status" className="text-sm text-fg-mut">Carregando permissões de Faturas...</p>;

  const current = data.roles.find((r) => r.role === role);
  const active = draft[role] ?? current?.permissions ?? [];
  const dirty = role in draft;
  const locked = Boolean(current?.locked);

  function toggle(permission: string) {
    const next = active.includes(permission) ? active.filter((p) => p !== permission) : [...active, permission];
    setDraft((d) => ({ ...d, [role]: next }));
  }
  const clearDraft = () => setDraft((d) => { const n = { ...d }; delete n[role]; return n; });

  async function save() {
    setBusy(true);
    try {
      await api.faturas.setRolePermissions(role, active);
      clearDraft();
      await load();
      toast.success(`Permissões de Faturas de ${ROLE_LABEL[role] ?? role} salvas.`);
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }

  async function reset() {
    setBusy(true);
    try {
      await api.faturas.resetRolePermissions(role);
      clearDraft();
      await load();
      toast.success('Perfil voltou ao padrão.');
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível restaurar.'); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="faturas-perms-title">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><Receipt size={20} aria-hidden="true" /></div>
        <div>
          <h2 id="faturas-perms-title" className="text-lg font-black text-slate-950">Permissões da aba Faturas</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Escolha o que cada perfil pode ver e fazer em Faturas. Vale para todas as empresas. Quem tem permissões personalizadas na tela de Usuários continua seguindo a lista própria.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
        <div role="tablist" aria-label="Perfis" className="space-y-1">
          {data.roles.map((r) => (
            <button key={r.role} type="button" role="tab" aria-selected={role === r.role} onClick={() => setRole(r.role)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${role === r.role ? 'bg-violet-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>
              <span>{ROLE_LABEL[r.role] ?? r.role}</span>
              <span className="flex items-center gap-1.5 text-[10px] opacity-80">
                {r.role in draft && 'rascunho'}{r.customized && !(r.role in draft) && 'ajustado'}
                <span className="font-black">{(draft[r.role] ?? r.permissions).length}</span>
              </span>
            </button>
          ))}
        </div>

        <div>
          {locked && <p className="mb-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">O perfil DEV sempre tem acesso total e não pode ser alterado.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {data.catalog.map((permission) => (
              <label key={permission} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${active.includes(permission) ? 'border-violet-300 bg-violet-50/60' : 'border-slate-200 hover:bg-slate-50'} ${locked ? 'opacity-60' : ''}`}>
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600" disabled={locked || busy}
                  checked={locked ? true : active.includes(permission)} onChange={() => toggle(permission)} />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{PERMISSIONS_LABELS[permission as Permission]?.replace(/^Faturas: /, '') ?? permission}</span>
                  <span className="block text-[10px] text-slate-400">{permission}</span>
                </span>
              </label>
            ))}
          </div>
          {!locked && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => void reset()} disabled={busy || !current?.customized} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                <RotateCcw size={14} aria-hidden="true" /> Restaurar padrão
              </button>
              <span className="flex gap-2">
                {dirty && <button type="button" onClick={clearDraft} disabled={busy} className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>}
                <button type="button" onClick={() => void save()} disabled={busy || !dirty} className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50">
                  <Save size={14} aria-hidden="true" /> {busy ? 'Salvando...' : 'Salvar perfil'}
                </button>
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
