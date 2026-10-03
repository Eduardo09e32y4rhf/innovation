'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { Button } from '@/app/components/ui/button';
import { PageHeader } from '@/app/components/ui/page-header';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/data-states';
import { Modal, Drawer, ConfirmDialog } from '../../escalas/_components/operational-dialog';
import { onboardingApi, type OnboardingFlow, type OnboardingTask } from './onboarding-api';

const STATUS: Record<string, string> = { PENDING: 'Pendente', IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluído', CANCELLED: 'Cancelado' };

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const { tenant } = useParams() as { tenant: string };
  const canManage = ['DEV', 'ADMIN', 'RH'].includes(String(user?.profile ?? user?.role ?? '').toUpperCase());
  const [creating, setCreating] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ flow: OnboardingFlow; task?: OnboardingTask } | null>(null);
  const list = useQuery(onboardingApi.list, [tenant], { enabled: canManage });
  const employees = useQuery(api.employees.list, [tenant], { enabled: canManage });
  const detail = useQuery(() => onboardingApi.get(selectedId!), [selectedId, tenant], { enabled: canManage && !!selectedId });
  const flows = list.data ?? [];
  const name = (id: string) => employees.data?.find(employee => employee.id === id)?.name ?? `Funcionário ${id.slice(0, 8)}`;
  const eligible = (employees.data ?? []).filter(employee => !['TERMINATED', 'INACTIVE'].includes(employee.status));
  const filtered = flows.filter(flow => (!status || flow.status === status) && name(flow.employeeId).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const occupied = useMemo(() => new Set(flows.map(flow => flow.employeeId)), [flows]);
  const create = useMutation(onboardingApi.create, {
    onSuccess: flow => { setCreating(false); setEmployeeId(''); list.refetch(); setSelectedId(flow.id); toast.success('Processo de admissão criado.'); },
  });
  const mutate = useMutation(async (value: NonNullable<typeof decision>) => {
    if (value.task) return onboardingApi.completeTask(value.task.id);
    return onboardingApi.remove(value.flow.id);
  }, {
    onSuccess: (_, value) => {
      setDecision(null); list.refetch();
      if (value.task) { setSelectedId(value.flow.id); toast.success('Tarefa concluída.'); }
      else { setSelectedId(null); toast.success('Processo excluído. O funcionário foi preservado.'); }
    },
  });

  useEffect(() => { setSelectedId(null); setDecision(null); setCreating(false); setEmployeeId(''); }, [tenant, user?.companyId]);

  if (authLoading) return <LoadingState label="Carregando admissão..." />;
  if (!canManage) return <ErrorState message="Admissão disponível para DEV, ADMIN e RH." />;

  const flow = detail.data;
  return (
    <div className="space-y-5">
      <PageHeader title="Admissão" subtitle="Acompanhe as tarefas e os documentos dos processos de integração." actions={<>
        <Button variant="outline" onClick={list.refetch} disabled={list.loading}><RefreshCw size={18} /> Atualizar</Button>
        <Button onClick={() => setCreating(true)}><Plus size={18} /> Novo processo</Button>
      </>} />
      <div className="card-v2 grid gap-3 p-4 sm:grid-cols-2">
        <label className="space-y-1"><span>Buscar funcionário</span><input className="input-v2 w-full" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label className="space-y-1"><span>Estado do processo</span><select className="input-v2 w-full" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos os estados</option>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {list.loading ? <LoadingState label="Carregando processos..." /> : list.error ? <ErrorState message={list.error} onRetry={list.refetch} /> : filtered.length === 0 ? <EmptyState message={flows.length ? 'Nenhum processo corresponde aos filtros.' : 'Nenhum processo de admissão cadastrado.'} /> :
        <div className="grid gap-4 lg:grid-cols-2">{filtered.map(item => {
          const completed = item.tasks.filter(task => task.completedAt).length;
          const pending = item.tasks.filter(task => task.required && !task.completedAt).length;
          return <article key={item.id} className="card-v2 space-y-3 p-4">
            <div className="flex flex-wrap justify-between gap-2"><h2 className="text-base font-semibold">{name(item.employeeId)}</h2><span className="text-sm">{STATUS[item.status] ?? item.status}</span></div>
            <p>{completed} de {item.tasks.length} tarefas concluídas · {pending} obrigatórias pendentes</p>
            <progress className="h-2 w-full accent-purple-700" max={Math.max(item.tasks.length, 1)} value={completed} aria-label={`Tarefas de ${name(item.employeeId)}`} />
            <p className="text-sm text-slate-500">Criado em {new Date(item.createdAt).toLocaleDateString('pt-BR')}</p>
            <Button variant="outline" onClick={() => setSelectedId(item.id)}>Abrir processo</Button>
          </article>;
        })}</div>}
      {employees.error && <ErrorState message={employees.error} onRetry={employees.refetch} />}

      <Modal isOpen={creating} onClose={() => { if (!create.loading) setCreating(false); }} title="Novo processo de admissão">
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (employeeId && !occupied.has(employeeId) && !create.loading) void create.mutate(employeeId).catch(() => {}); }}>
          <label className="block space-y-1"><span>Funcionário *</span><select required className="input-v2 w-full" value={employeeId} onChange={event => setEmployeeId(event.target.value)} disabled={employees.loading || list.loading || !!employees.error || !!list.error || create.loading}>
            <option value="">Selecione um funcionário</option>{eligible.map(employee => <option key={employee.id} value={employee.id} disabled={occupied.has(employee.id)}>{employee.name}{occupied.has(employee.id) ? ' — já possui processo' : ''}</option>)}
          </select></label>
          <p className="text-sm text-slate-500">O checklist será criado pelo servidor. ASO e documentos continuam nos respectivos módulos.</p>
          {create.error && <p role="alert" className="text-red-700">{create.error}</p>}
          <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" disabled={create.loading} onClick={() => setCreating(false)}>Cancelar</Button><Button type="submit" isLoading={create.loading} disabled={!employeeId || occupied.has(employeeId) || list.loading || !!list.error || !!employees.error}>Criar processo</Button></div>
        </form>
      </Modal>

      <Drawer isOpen={!!selectedId} onClose={() => setSelectedId(null)} title={flow ? `Admissão — ${name(flow.employeeId)}` : 'Processo de admissão'} maxWidth="max-w-2xl">
        {detail.loading ? <LoadingState label="Carregando checklist..." /> : detail.error ? <ErrorState message={detail.error} onRetry={detail.refetch} /> : flow && <div className="space-y-5">
          <p>Estado: {STATUS[flow.status] ?? flow.status}. O progresso abaixo reflete as tarefas retornadas pelo servidor.</p>
          <nav className="flex flex-wrap gap-2" aria-label="Dados relacionados à admissão">
            <Link className="btn btn-outline" href={`/${tenant}/dashboard/employees?employeeId=${encodeURIComponent(flow.employeeId)}`}>Funcionário</Link>
            <Link className="btn btn-outline" href={`/${tenant}/dashboard/management/aso?employeeId=${encodeURIComponent(flow.employeeId)}`}>ASO</Link>
            <Link className="btn btn-outline" href={`/${tenant}/dashboard/escalas/documentos`}>Documentos</Link>
          </nav>
          <ul className="space-y-3">{flow.tasks.map(task => <li key={task.id} className="card-v2 space-y-2 p-4"><div className="flex flex-wrap justify-between gap-2"><h3>{task.title}</h3><span>{task.completedAt ? 'Concluída' : task.required ? 'Obrigatória · pendente' : 'Opcional · pendente'}</span></div>{task.description && <p>{task.description}</p>}{task.completedAt ? <p className="text-sm text-slate-500">Concluída em {new Date(task.completedAt).toLocaleString('pt-BR')}</p> : <Button variant="outline" onClick={() => { setSelectedId(null); setDecision({ flow, task }); }}>Concluir tarefa</Button>}</li>)}</ul>
          {flow.documents.length > 0 && <section className="space-y-2"><h2>Documentos do checklist</h2>{flow.documents.map(document => <p key={document.id}>{document.name} · {document.uploadedAt ? 'Enviado' : 'Pendente'}{document.required ? ' · obrigatório' : ''}</p>)}</section>}
          <Button variant="danger" onClick={() => { setSelectedId(null); setDecision({ flow }); }}>Excluir processo</Button>
        </div>}
      </Drawer>
      <ConfirmDialog isOpen={!!decision} onClose={() => { if (decision) setSelectedId(decision.flow.id); setDecision(null); }} onConfirm={async () => { if (decision && !mutate.loading) await mutate.mutate(decision).catch(() => {}); }} title={decision?.task ? 'Concluir tarefa' : 'Excluir processo de admissão'} description={decision?.task ? `Confirme a conclusão de “${decision.task.title}” para ${name(decision.flow.employeeId)}. Essa tarefa não poderá ser reaberta por esta tela.` : `Excluir o processo de ${decision ? name(decision.flow.employeeId) : ''}? O cadastro do funcionário será preservado.`} confirmText={decision?.task ? 'Concluir tarefa' : 'Excluir processo'} variant={decision?.task ? 'primary' : 'danger'} isLoading={mutate.loading} />
      {mutate.error && <p role="alert" className="text-red-700">{mutate.error}</p>}
    </div>
  );
}
