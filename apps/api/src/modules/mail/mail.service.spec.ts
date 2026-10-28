import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MailService } from './mail.service';

const content = { subject: 'Teste', text: 'Mensagem', html: '<p>Mensagem</p>' };
beforeEach(() => {
  for (const key of ['RESEND_API_KEY', 'MAIL_FROM', 'AWS_SES_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'SMTP_HOST']) vi.stubEnv(key, '');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function resend(response: Response) {
  vi.stubEnv('RESEND_API_KEY', 'test-key-not-real');
  vi.stubEnv('MAIL_FROM', 'sender@example.test');
  const fetch = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('MailService: aceite e idempotência Resend', () => {
  it('envia a chave ao endpoint documentado e retorna o ID do provedor', async () => {
    const fetch = resend(new Response(JSON.stringify({ id: 'mail-1' }), { status: 200 }));
    await expect(new MailService().send('recipient@example.test', content, { idempotencyKey: 'event-1' })).resolves.toEqual({ sent: true, provider: 'resend', messageId: 'mail-1' });
    expect(fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({ signal: expect.any(AbortSignal), headers: expect.objectContaining({ 'Idempotency-Key': 'event-1' }) }));
  });
  it('resposta 2xx sem ID não vira sucesso fictício', async () => {
    resend(new Response('{}', { status: 200 }));
    await expect(new MailService().send('recipient@example.test', content)).resolves.toMatchObject({ sent: false, provider: 'resend' });
  });
  it('429 é falha de envio', async () => {
    resend(new Response('rate limited', { status: 429 }));
    await expect(new MailService().send('recipient@example.test', content)).resolves.toMatchObject({ sent: false, provider: 'resend' });
  });
  it('sem configuração não chama um serviço externo', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(new MailService().send('recipient@example.test', content)).resolves.toEqual({ sent: false, provider: 'none' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
