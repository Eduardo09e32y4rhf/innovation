import { api } from '@/app/lib/api';
import type { WorkspaceApi } from './support-workspace';
import type { ReplyInput } from './reply-box';
import type { SupportTicket } from './support-model';

/** Envia os anexos um a um; devolve o nome dos que falharam (a mensagem já foi enviada). */
async function uploadAll(ticketId: string, files: File[]): Promise<string[]> {
  const failed: string[] = [];
  for (const file of files) {
    try { await api.support.uploadAttachment(ticketId, file); } catch { failed.push(file.name); }
  }
  return failed;
}

async function finishUploads(ticket: SupportTicket, input: ReplyInput) {
  const failed = await uploadAll(ticket.id, input.files);
  if (failed.length) {
    const { toast } = await import('sonner');
    toast.error(`A mensagem foi enviada, mas estes anexos falharam: ${failed.join(', ')}. Anexe-os de novo.`);
  }
}

const asList = (data: unknown): SupportTicket[] => (Array.isArray(data) ? (data as SupportTicket[]) : []);

export const companySupportApi: WorkspaceApi = {
  list: async () => asList(await api.support.list()),
  get: (id) => api.support.get(id),
  reply: async (ticket, input) => {
    await api.support.reply(ticket.id, { message: input.text });
    await finishUploads(ticket, input);
  },
  download: (ticket, a) => api.support.downloadAttachment(ticket.id, a.id),
};

export const platformSupportWorkspaceApi = (companyId?: string): WorkspaceApi => ({
  list: async () => asList(await api.platformSupport.list(companyId ? { companyId } : undefined)),
  get: (id) => api.platformSupport.get(id),
  reply: async (ticket, input) => {
    if (input.internal) await api.platformSupport.internalNote(ticket.id, { message: input.text });
    else await api.platformSupport.reply(ticket.id, { message: input.text });
    await finishUploads(ticket, input);
  },
  download: (ticket, a) => api.support.downloadAttachment(ticket.id, a.id),
});
