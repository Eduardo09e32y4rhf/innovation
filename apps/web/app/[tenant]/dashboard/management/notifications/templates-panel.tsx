'use client';

import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, ConfirmDialog, Modal } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { api, type DocumentTemplateInput, type DocumentTemplateItem } from '@/app/lib/api';

const KIND_LABEL: Record<string, string> = { ADVERTENCIA: 'Advertência', SUSPENSAO: 'Suspensão', COMUNICADO: 'Comunicado', OUTRO: 'Outro' };
const EMPTY: DocumentTemplateInput = { name: '', kind: 'ADVERTENCIA', title: '', body: '', isActive: true };
const field = 'input-v2 w-full text-sm';
const message = (cause: unknown, fallback: string) => (cause instanceof Error && cause.message ? cause.message : fallback);

/** Modelos de documento da própria empresa. Termo de uso e boas-vindas continuam sendo da Innovation e não aparecem aqui. */
export function TemplatesPanel({ onClose }: { onClose: () => void }) {
  const data = useQuery(() => api.documentTemplates.list(), []);
  const [editing, setEditing] = useState<{ id?: string; form: DocumentTemplateInput } | null>(null);
  const [removing, setRemoving] = useState<DocumentTemplateItem | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      if (editing.id) await api.documentTemplates.update(editing.id, editing.form); else await api.documentTemplates.create(editing.form);
      toast.success('Modelo salvo.'); setEditing(null); data.refetch();
    } catch (cause) { toast.error(message(cause, 'Não foi possível salvar o modelo.')); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!removing) return;
    setBusy(true);
    try { await api.documentTemplates.remove(removing.id); toast.success('Modelo removido.'); setRemoving(null); data.refetch(); }
    catch (cause) { toast.error(message(cause, 'Não foi possível remover.')); }
    finally { setBusy(false); }
  }

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title="Modelos de documento da empresa" description="Seus próprios textos de advertência, suspensão e comunicado. Na hora de enviar, é só escolher o modelo." maxWidth="max-w-3xl">
      {data.loading && !data.data ? <LoadingState label="Carregando modelos…" /> : data.error ? <ErrorState message={data.error} onRetry={data.refetch} /> : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">O termo de uso e as boas-vindas são da Innovation e não podem ser alterados. Os termos disciplinares padrão continuam valendo quando você não escolher um modelo.</p>
            <Button size="sm" onClick={() => setEditing({ form: { ...EMPTY } })}><Plus size={14} aria-hidden="true" /> Novo modelo</Button>
          </div>
          {(data.data?.templates ?? []).length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Nenhum modelo ainda.</p> : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {data.data!.templates.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 p-3">
                  <FileText size={18} className="text-slate-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t.name} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{KIND_LABEL[t.kind]}</span>{!t.isActive && <span className="ml-1 rounded-full bg-zinc-200 px-2 py-0.5 text-[11px]">Desligado</span>}</p><p className="truncate text-xs text-slate-500">{t.title}</p></div>
                  <Button size="sm" variant="outline" aria-label={`Editar ${t.name}`} onClick={() => setEditing({ id: t.id, form: { name: t.name, kind: t.kind, title: t.title, body: t.body, isActive: t.isActive } })}><Pencil size={14} aria-hidden="true" /></Button>
                  <Button size="sm" variant="danger" aria-label={`Remover ${t.name}`} onClick={() => setRemoving(t)}><Trash2 size={14} aria-hidden="true" /></Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal isOpen={Boolean(editing)} onClose={() => !busy && setEditing(null)} title={editing?.id ? 'Editar modelo' : 'Novo modelo'} maxWidth="max-w-2xl"
        footer={<div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setEditing(null)}>Cancelar</Button><Button isLoading={busy} onClick={() => void save()}>Salvar</Button></div>}>
        {editing && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">Nome do modelo<input className={field} maxLength={100} placeholder="Ex.: Advertência por atraso" value={editing.form.name} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} /></label>
              <label className="block text-sm font-medium">Tipo<select className={field} value={editing.form.kind} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, kind: e.target.value as DocumentTemplateInput['kind'] } })}>{Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label className="block text-sm font-medium sm:col-span-2">Título do documento<input className={field} maxLength={150} placeholder="Ex.: Termo de Advertência" value={editing.form.title} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, title: e.target.value } })} /></label>
            </div>
            <label className="block text-sm font-medium">Texto
              <textarea className={`${field} min-h-48 font-mono`} value={editing.form.body} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, body: e.target.value } })} placeholder={'Prezado(a) {{nome}},\n\nEm {{data_ocorrencia}} foi constatado: {{motivo}}.\n\n{{empresa}}'} />
            </label>
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-600">Campos que o sistema preenche sozinho (clique para inserir):</p>
              <div className="flex flex-wrap gap-1.5">
                {(data.data?.variables ?? []).map((v) => <button key={v.key} type="button" title={v.label} onClick={() => setEditing({ ...editing, form: { ...editing.form, body: `${editing.form.body}{{${v.key}}}` } })} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs hover:bg-slate-50">{`{{${v.key}}}`}</button>)}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.form.isActive} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, isActive: e.target.checked } })} /> Modelo ligado (aparece na hora de enviar)</label>
          </div>
        )}
      </Modal>
      <ConfirmDialog isOpen={Boolean(removing)} onClose={() => !busy && setRemoving(null)} onConfirm={remove} isLoading={busy} variant="danger" title="Remover modelo" confirmText="Remover" description={`Remover "${removing?.name ?? ''}"? Documentos já emitidos não mudam.`} />
    </Modal>
  );
}
