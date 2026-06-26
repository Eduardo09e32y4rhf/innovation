'use client';

import { useState } from 'react';
import { Bell, Plus, Archive, Trash2, Check, Filter, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';

type FilterType = 'all' | 'unread' | 'system' | 'admin' | 'urgent' | 'archived';

export default function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const profile = user?.profile?.toUpperCase();
  const isRhOrAdmin = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';

  const [filter, setFilter] = useState<FilterType>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const listQuery = useQuery(() => api.notifications.list(), []);
  const unreadQuery = useQuery(() => api.notifications.unreadCount(), []);

  const markReadMut = useMutation((id: string) => api.notifications.markAsRead(id), {
    onSuccess: () => {
      listQuery.refetch();
      unreadQuery.refetch();
    },
  });
  const markAllReadMut = useMutation(() => api.notifications.markAllAsRead(), {
    onSuccess: () => {
      listQuery.refetch();
      unreadQuery.refetch();
    },
  });
  const archiveMut = useMutation((id: string) => api.notifications.archive(id), {
    onSuccess: () => listQuery.refetch(),
  });
  const deleteMut = useMutation((id: string) => api.notifications.delete(id), {
    onSuccess: () => listQuery.refetch(),
  });

  const notifications = (listQuery.data ?? []) as any[];
  const unreadCount = unreadQuery.data?.count ?? 0;

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return n.recipients?.[0]?.status === 'UNREAD';
    if (filter === 'system') return n.type === 'SYSTEM_NOTICE';
    if (filter === 'admin') return n.type === 'RH_NOTICE' || n.type === 'SYSTEM_NOTICE';
    if (filter === 'urgent') return n.priority === 'URGENT';
    if (filter === 'archived') return n.recipients?.[0]?.status === 'ARCHIVED';
    return true;
  });

  const priorityCls: Record<string, string> = {
    URGENT: 'border-rose-200 bg-rose-50 text-rose-700',
    HIGH: 'border-amber-200 bg-amber-50 text-amber-700',
    NORMAL: 'border-slate-200 bg-white text-slate-700',
    LOW: 'border-slate-100 bg-slate-50 text-slate-600',
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">NOTIFICAÇÕES</p>
          <h2 className="text-2xl font-black text-slate-950">Central de avisos</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Avisos automáticos e comunicados do RH.</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllReadMut.mutate()}
              disabled={markAllReadMut.loading}
              className="btn-outline inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black disabled:opacity-60"
            >
              <Check size={14} />
              Marcar todas como lidas
            </button>
          )}
          {isRhOrAdmin && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] bg-gradient-to-r from-teal-500 to-cyan-600 px-4 text-xs font-black text-white shadow-lg shadow-teal-500/25"
            >
              <Plus size={14} />
              Novo aviso
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>Todas</FilterButton>
        <FilterButton active={filter === 'unread'} onClick={() => setFilter('unread')}>
          Não lidas {unreadCount > 0 && <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-white">{unreadCount}</span>}
        </FilterButton>
        <FilterButton active={filter === 'system'} onClick={() => setFilter('system')}>System</FilterButton>
        <FilterButton active={filter === 'admin'} onClick={() => setFilter('admin')}>Admin User</FilterButton>
        <FilterButton active={filter === 'urgent'} onClick={() => setFilter('urgent')}>Urgentes</FilterButton>
      </div>

      {/* List */}
      {listQuery.loading && <LoadingState label="Carregando notificações..." />}
      {listQuery.error && <ErrorState message={listQuery.error} onRetry={listQuery.refetch} />}
      {!listQuery.loading && !listQuery.error && filtered.length === 0 && (
        <EmptyState message="Nenhuma notificação encontrada." />
      )}

      <div className="space-y-3">
        {filtered.map((n) => {
          const isUnread = n.recipients?.[0]?.status === 'UNREAD';
          return (
            <div
              key={n.id}
              className={`rounded-[12px] border p-4 shadow-sm transition-all hover:shadow-md ${priorityCls[n.priority] ?? priorityCls.NORMAL}`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {n.type === 'SYSTEM_NOTICE' ? 'System' : 'Admin User'}
                    </span>
                    {n.createdByUser && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        por {n.createdByUser.name}
                      </span>
                    )}
                    {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                  </div>
                  <h3 className="mt-1 text-sm font-black text-slate-950">{n.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-600">{n.message}</p>
                  <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
                    {new Date(n.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => markReadMut.mutate(n.id)}
                      disabled={markReadMut.loading}
                      className="btn-outline-premium h-8 px-2.5 text-[10px] font-black disabled:opacity-60"
                    >
                      <Check size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => archiveMut.mutate(n.id)}
                    disabled={archiveMut.loading}
                    className="btn-outline h-8 px-2.5 text-[10px] font-black disabled:opacity-60"
                  >
                    <Archive size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Excluir notificação?')) deleteMut.mutate(n.id);
                    }}
                    disabled={deleteMut.loading}
                    className="inline-flex h-8 items-center rounded-[6px] bg-gradient-to-r from-rose-500 to-pink-600 px-2.5 text-[10px] font-black text-white disabled:opacity-60"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <CreateNoticeModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            listQuery.refetch();
            unreadQuery.refetch();
          }}
        />
      )}
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center rounded-[6px] px-3 text-[11px] font-black transition-all ${
        active ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20' : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-500'
      }`}
    >
      {children}
    </button>
  );
}

function CreateNoticeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [targetType, setTargetType] = useState<'ALL' | 'EMPLOYEES' | 'ROLE' | 'SPECIFIC'>('ALL');
  const [targetRole, setTargetRole] = useState('');
  const [targetIds, setTargetIds] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const canSubmit = title.trim() && message.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await api.notifications.createAdminNotice({
        title: title.trim(),
        message: message.trim(),
        priority,
        targetType,
        targetRole: targetType === 'ROLE' ? targetRole : undefined,
        targetIds: targetType === 'SPECIFIC' ? targetIds.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        expiresAt: expiresAt || undefined,
      });
      await queryClient.invalidateQueries();
      onSuccess();
    } catch (err) {
      window.alert('Erro ao criar aviso.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">Novo aviso</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} className="rotate-45" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600">
            <span>TÍTULO</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
          </label>
          <label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600">
            <span>MENSAGEM</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500" />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>PRIORIDADE</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
              <option value="LOW">Baixa</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>EXPIRA EM (OPCIONAL)</span>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
          </label>
          <label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600">
            <span>DESTINATÁRIOS</span>
            <select value={targetType} onChange={(e) => setTargetType(e.target.value as any)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
              <option value="ALL">Todos os usuários</option>
              <option value="EMPLOYEES">Todos os funcionários ativos</option>
              <option value="ROLE">Por perfil de acesso</option>
              <option value="SPECIFIC">IDs específicos</option>
            </select>
          </label>
          {targetType === 'ROLE' && (
            <label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600">
              <span>PERFIL</span>
              <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
                <option value="">Selecione...</option>
                <option value="DEV">Dev</option>
                <option value="ADMIN">Admin</option>
                <option value="RH">RH</option>
                <option value="GESTOR">Gestor</option>
                <option value="FUNCIONARIO">Funcionário</option>
                <option value="CONSULTA">Consulta</option>
              </select>
            </label>
          )}
          {targetType === 'SPECIFIC' && (
            <label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600">
              <span>IDs DE USUÁRIO (separados por vírgula)</span>
              <input value={targetIds} onChange={(e) => setTargetIds(e.target.value)} placeholder="uuid1, uuid2" className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
          )}
          <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">CANCELAR</button>
            <button type="submit" disabled={!canSubmit || saving} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">
              {saving ? 'ENVIANDO...' : 'ENVIAR AVISO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}