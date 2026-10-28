import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailSendWorker } from './email-send.worker';

const companyId = 'bf7dd7c2-28cd-43b7-89d0-d9105e43a3c2';
function job(over: Record<string, unknown> = {}, timestamp = Date.now()) {
  return { id: 'notification-1', timestamp, data: { companyId, email: 'person@example.test', subject: 'Aviso', text: 'Ação <confirmar>', ...over }, discard: vi.fn() } as any;
}

describe('email-send: resultado real do provedor', () => {
  let mail: { send: ReturnType<typeof vi.fn> };
  let worker: EmailSendWorker;
  beforeEach(() => {
    mail = { send: vi.fn().mockResolvedValue({ sent: true, provider: 'resend', messageId: 'provider-id' }) };
    worker = new EmailSendWorker(mail as never);
  });
  it('envia pelo MailService, escapa HTML e registra aceitação/ID, sem afirmar entrega', async () => {
    const task = job();
    const result = await worker.handleEmailSend(task);
    expect(mail.send).toHaveBeenCalledWith('person@example.test', { subject: 'Aviso', text: 'Ação <confirmar>', html: '<pre>Ação &lt;confirmar&gt;</pre>' }, { idempotencyKey: expect.stringMatching(/^innovation-email\/[a-f0-9]{64}$/) });
    expect(result).toEqual({ accepted: true, provider: 'resend', messageId: 'provider-id' });
    expect(result).not.toHaveProperty('delivered');
  });
  it('repetição mantém a chave; outra empresa usa outra chave', async () => {
    await worker.handleEmailSend(job());
    await worker.handleEmailSend(job());
    await worker.handleEmailSend(job({ companyId: 'c23e7b67-da28-488e-8e0e-c5df3db9c7ee' }));
    expect(mail.send.mock.calls[0][2]).toEqual(mail.send.mock.calls[1][2]);
    expect(mail.send.mock.calls[0][2]).not.toEqual(mail.send.mock.calls[2][2]);
  });
  it('rejeição do Resend falha o job para a política limitada de retry', async () => {
    mail.send.mockResolvedValue({ sent: false, provider: 'resend', error: '429' });
    const task = job();
    await expect(worker.handleEmailSend(task)).rejects.toThrow('EMAIL_NOT_ACCEPTED:resend');
    expect(task.discard).not.toHaveBeenCalled();
  });
  it.each(['none', 'smtp', 'ses'])('falha sem idempotência comprovada (%s) exige revisão', async (provider) => {
    mail.send.mockResolvedValue({ sent: false, provider, error: 'timeout' });
    const task = job();
    await expect(worker.handleEmailSend(task)).rejects.toThrow('EMAIL_NOT_ACCEPTED');
    expect(task.discard).toHaveBeenCalledOnce();
  });
  it('replay fora da janela é retido para conciliação sem reenviar', async () => {
    const task = job({}, Date.now() - 24 * 60 * 60 * 1000);
    await expect(worker.handleEmailSend(task)).rejects.toThrow('EMAIL_RECONCILIATION_REQUIRED');
    expect(mail.send).not.toHaveBeenCalled();
    expect(task.discard).toHaveBeenCalledOnce();
  });
  it.each([{ companyId: undefined }, { email: 'bad' }, { subject: 42 }, { subject: '' }, { text: 'a'.repeat(100001) }])('payload inválido não é enviado: %j', async (over) => {
    const task = job(over);
    await expect(worker.handleEmailSend(task)).rejects.toThrow('EMAIL_INVALID_JOB');
    expect(mail.send).not.toHaveBeenCalled();
    expect(task.discard).toHaveBeenCalledOnce();
  });
});
