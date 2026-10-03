'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { api, type PasswordResetEmployee } from '@/app/lib/api';
import { availableUserRoles } from '../../users/_components/access-policy';
import { UserPasswordResetModal } from '../../users/_components/user-password-reset-modal';

export function EmployeePasswordResetSection() {
  const params = useParams();
  const { user } = useAuth();
  const role = (user?.role || user?.profile || '').toUpperCase();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PasswordResetEmployee[]>([]);
  const [selected, setSelected] = useState<PasswordResetEmployee | null>(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setResults([]); setSearched(false); setError('');
    if (search.trim().length < 2 || selected) { setSearching(false); return; }
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const data = await api.auth.searchEmployeesForPasswordReset(search.trim());
        if (!cancelled) { setResults(data); setSearched(true); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Não foi possível buscar os funcionários.');
      } finally { if (!cancelled) setSearching(false); }
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [search, selected, user?.companyId]);
  const targetAllowed = selected?.user && selected.user.id !== user?.id && selected.user.isActive &&
    selected.user.role !== 'DEV' && availableUserRoles(role).includes(selected.user.role);
  function cancel() { setSelected(null); setSearch(''); setResults([]); setError(''); setResetOpen(false); }
  return <section className="card-v2 p-4 sm:p-6">
    <h2 className="text-lg font-semibold text-fg">Acessos de funcionários</h2>
    <p className="mt-1 text-sm text-fg-mut">Busque pelo nome ou matrícula de um funcionário com conta vinculada. A busca retorna até 20 resultados da empresa atual.</p>
    <div className="mt-5 space-y-4">
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
      <label className="block space-y-2 text-sm font-medium"><span>Buscar funcionário</span>
        <input type="search" value={search} onChange={event => { setSearch(event.target.value); setSelected(null); setSuccess(''); }}
          placeholder="Digite pelo menos 2 caracteres" className="input-v2 min-h-11 text-base sm:text-sm" />
      </label>
      {searching && <p role="status" className="text-sm text-fg-mut">Buscando funcionários...</p>}
      {searched && !results.length && !selected && <p role="status" className="text-sm text-fg-mut">Nenhum funcionário com conta vinculada corresponde à busca. Sem uma conta, não há senha para redefinir.</p>}
      {!selected && results.length > 0 && <ul className="max-h-80 space-y-2 overflow-y-auto">
        {results.map(employee => <li key={employee.id}><Button type="button" variant="outline" className="h-auto min-h-11 w-full justify-start whitespace-normal text-left"
          onClick={() => { setSelected(employee); setResults([]); setSuccess(''); }}>
          <span className="min-w-0"><span className="block break-words font-medium">{employee.name}</span>
            <span className="block text-sm text-fg-mut">Matrícula: {employee.registration || 'Não informada'}{employee.position ? ` · ${employee.position}` : ''}</span></span>
        </Button></li>)}
      </ul>}
      {selected && <div className="space-y-4 rounded-xl border border-border bg-bg-sub p-4">
        <p className="break-words text-sm font-semibold">{selected.name}</p>
        <p className="text-sm text-fg-mut">Matrícula: {selected.registration || 'Não informada'} · {selected.email || 'E-mail não informado'}</p>
        {!targetAllowed && <p role="status" className="text-sm text-amber-800">{selected.user?.id === user?.id
          ? 'Para alterar sua própria senha, abra Segurança e acesso.'
          : selected.user?.isActive === false ? 'Esta conta está bloqueada. Um administrador autorizado precisa desbloqueá-la antes do reset de funcionário.'
            : 'Seu perfil não pode redefinir a senha desta conta.'}</p>}
        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled={!targetAllowed} onClick={() => setResetOpen(true)}>Redefinir senha do funcionário</Button>
          <Button type="button" variant="outline" onClick={cancel}>Cancelar</Button>
        </div>
      </div>}
      <p className="text-sm text-fg-mut">Para criar um acesso ou revisar o vínculo, consulte <Link href={`/${params.tenant}/dashboard/users`} className="font-medium underline underline-offset-4">Usuários</Link> e o cadastro do funcionário.</p>
    </div>
    <UserPasswordResetModal isOpen={resetOpen} user={selected ? { id: selected.userId, name: selected.name, email: selected.email ?? undefined } : null}
      onClose={() => setResetOpen(false)} onSubmit={async password => {
        if (!selected || !targetAllowed) throw new Error('Reset não autorizado para esta conta.');
        const targetName = selected.name;
        await api.auth.resetEmployeePassword(selected.id, password);
        setSuccess(`Senha temporária de ${targetName} redefinida. A troca será obrigatória no próximo login.`);
        setSelected(null); setSearch(''); setResults([]);
      }} />
  </section>;
}
