'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { privacyApi, type PrivacyRequest } from '../privacy-api';
import { SectionCard, inputClass } from './bits';
import { useConfirm } from '@/app/components/ui/confirm-provider';

const TYPE_LABEL: Record<string, string> = { ACCESS: 'Acesso aos dados', CORRECTION: 'Correção', DELETION: 'Exclusão' };
const message = (cause: unknown, fallback: string) => (cause instanceof ApiError ? cause.message : fallback);

function RequestRow({ item, onDone }: { item: PrivacyRequest; onDone: () => void }) {
  const [response, setResponse] = useState(item.type === 'DELETION' ? 'Seus dados foram excluídos da nossa base de recrutamento.' : '');
  const [busy, setBusy] = useState(false);

  async function download() {
    try {
      const data = await privacyApi.exportData(item.id);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'dados-do-candidato.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (cause) { toast.error(message(cause, 'Não foi possível exportar.')); }
  }
  const askConfirm = useConfirm();
  async function answer(perform?: boolean) {
    if (perform === true && !(await askConfirm({ title: 'Excluir dados do candidato', description: 'Excluir definitivamente os dados deste candidato (currículo, respostas, notas)? Contratados são preservados. Esta ação não pode ser desfeita.', confirmText: 'Excluir dados', requireText: 'EXCLUIR' }))) return;
    setBusy(true);
    try { await privacyApi.answer(item.id, { response, ...(perform === undefined ? {} : { perform }) }); toast.success('Pedido respondido.'); onDone(); }
    catch (cause) { toast.error(message(cause, 'Não foi possível responder.')); }
    finally { setBusy(false); }
  }
  return (
    <li className="space-y-2 rounded-xl border border-border p-3">
      <p className="text-sm"><strong>{TYPE_LABEL[item.type]}</strong> · {item.email} · {new Date(item.createdAt).toLocaleDateString('pt-BR')} {item.dueAt && item.status === 'OPEN' && <span className="ml-2 text-xs text-fg-sub">prazo {new Date(item.dueAt).toLocaleDateString('pt-BR')}</span>} {item.status === 'DONE' && <span className="ml-2 rounded-full bg-emerald-100 px-2 text-xs font-bold text-emerald-800">Respondido</span>}</p>
      {item.message && <p className="text-xs text-fg-sub">“{item.message}”</p>}
      {item.status === 'OPEN' ? (
        <div className="space-y-2">
          <textarea className={`${inputClass} min-h-16`} aria-label="Resposta ao candidato" maxLength={2000} placeholder="Resposta que o candidato vai receber por e-mail" value={response} onChange={(event) => setResponse(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            {item.type === 'ACCESS' && <Button variant="outline" size="sm" onClick={download}>Baixar dados (JSON)</Button>}
            {item.type === 'DELETION' ? (<>
              <Button size="sm" isLoading={busy} disabled={response.trim().length < 5} onClick={() => answer(true)}>Excluir dados e responder</Button>
              <Button variant="outline" size="sm" isLoading={busy} disabled={response.trim().length < 5} onClick={() => answer(false)}>Negar exclusão (explique na resposta)</Button>
            </>) : <Button size="sm" isLoading={busy} disabled={response.trim().length < 5} onClick={() => answer()}>Responder</Button>}
          </div>
        </div>
      ) : <p className="text-xs text-fg-sub">{item.response}</p>}
    </li>
  );
}

/** LGPD e comunicação: prazo de guarda, e-mails automáticos ao candidato e pedidos do titular. */
export function PrivacySettings() {
  const settings = useQuery(() => privacyApi.settings(), []);
  const requests = useQuery(() => privacyApi.requests(), []);
  const [form, setForm] = useState({ retentionMonths: 12, trackingTokenDays: 90, receiptEmail: true, rejectionEmail: true, rejectionMessage: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (settings.data) setForm({ retentionMonths: settings.data.retentionMonths, trackingTokenDays: settings.data.trackingTokenDays ?? 90, receiptEmail: settings.data.receiptEmail, rejectionEmail: settings.data.rejectionEmail, rejectionMessage: settings.data.rejectionMessage }); }, [settings.data]);

  async function save() {
    setSaving(true);
    try { await privacyApi.saveSettings(form); toast.success('Configurações salvas.'); settings.refetch(); }
    catch (cause) { toast.error(message(cause, 'Não foi possível salvar.')); }
    finally { setSaving(false); }
  }
  const open = (requests.data ?? []).filter((item) => item.status === 'OPEN').length;

  return (
    <>
      <SectionCard title="LGPD e e-mails ao candidato" description="Prazo de guarda dos dados e mensagens automáticas. Candidatos contratados não são apagados; os demais são anonimizados quando o prazo vence.">
        {settings.error && <ErrorState message={settings.error} onRetry={settings.refetch} />}
        {settings.loading && !settings.data ? <LoadingState label="Carregando…" /> : (
          <div className="space-y-3">
            <label className="block space-y-1 text-sm font-medium">Guardar dados de candidatos por (meses, de 3 a 60)<input type="number" min={3} max={60} className={`${inputClass} max-w-[140px]`} value={form.retentionMonths} onChange={(event) => setForm({ ...form, retentionMonths: Number(event.target.value) })} /></label>
            <label className="block space-y-1 text-sm font-medium">Validade do link de acompanhamento do candidato (dias, de 7 a 365)<input type="number" min={7} max={365} className={`${inputClass} max-w-[140px]`} value={form.trackingTokenDays} onChange={(event) => setForm({ ...form, trackingTokenDays: Number(event.target.value) })} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.receiptEmail} onChange={(event) => setForm({ ...form, receiptEmail: event.target.checked })} /> Enviar e-mail confirmando o recebimento da candidatura (com link para acompanhar)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.rejectionEmail} onChange={(event) => setForm({ ...form, rejectionEmail: event.target.checked })} /> Enviar feedback automático quando o candidato for reprovado</label>
            <label className="block space-y-1 text-sm font-medium">Mensagem de reprovação (opcional)<textarea className={`${inputClass} min-h-20`} maxLength={1500} placeholder="Se vazio, usamos um texto padrão e cordial." value={form.rejectionMessage} onChange={(event) => setForm({ ...form, rejectionMessage: event.target.value })} /></label>
            <p className="text-xs text-fg-sub">Versão da política registrada em cada candidatura: {settings.data?.privacyVersion}. Os e-mails dependem do envio de e-mail estar configurado no servidor.</p>
            <Button isLoading={saving} onClick={save}>Salvar</Button>
          </div>
        )}
      </SectionCard>

      <SectionCard title={`Pedidos de candidatos (LGPD)${open ? ` · ${open} aberto(s)` : ''}`} description="Acesso, correção e exclusão pedidos pelo candidato na página Meus dados. Responda dentro do prazo legal.">
        {requests.error && <ErrorState message={requests.error} onRetry={requests.refetch} />}
        {requests.loading && !requests.data ? <LoadingState label="Carregando…" /> : (requests.data ?? []).length === 0 ? <EmptyState message="Nenhum pedido de candidato." /> : (
          <ul className="space-y-2">{(requests.data ?? []).map((item) => <RequestRow key={item.id} item={item} onDone={requests.refetch} />)}</ul>
        )}
      </SectionCard>
    </>
  );
}