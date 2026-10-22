import { describe, expect, it, vi } from 'vitest';
import { AccessCredentialsService } from './access-credentials.service';
import { passwordResetCodeEmail, supportTicketOpenedEmail, welcomeAccessEmail } from './mail-templates';

const expiresAt = new Date('2026-10-22T15:30:00.000Z');
const base = { name: 'Ana Souza', companyName: 'Padaria Boa', email: 'ana@padaria.com', temporaryPassword: 'Ab3kQz', loginUrl: 'https://app.exemplo.com/login', expiresAt };

describe('e-mail de boas-vindas com o acesso', () => {
  it('leva e-mail de acesso, senha provisoria e validade em Sao Paulo', () => {
    const mail = welcomeAccessEmail(base);
    for (const part of [mail.html, mail.text]) {
      expect(part).toContain('ana@padaria.com');
      expect(part).toContain('Ab3kQz');
      expect(part).toContain('22/10/2026');
      expect(part).toContain('12:30'); // 15:30 UTC = 12:30 em Sao Paulo
    }
    expect(mail.subject).toContain('Bem-vindo');
  });

  it('a senha vai no corpo do e-mail e NUNCA na URL do botao', () => {
    const mail = welcomeAccessEmail(base);
    expect(base.loginUrl).not.toContain(base.temporaryPassword);
    expect(mail.html).toContain('href="https://app.exemplo.com/login"');
  });

  it('reenvio avisa que e uma nova senha provisoria', () => {
    const mail = welcomeAccessEmail({ ...base, reissued: true });
    expect(mail.subject).toContain('novo acesso');
    expect(mail.text).toContain('nova senha provisória');
  });

  it('escapa HTML em nome e empresa (nada injeta marcacao no e-mail)', () => {
    const mail = welcomeAccessEmail({ ...base, name: '<script>alert(1)</script>', companyName: '<img src=x onerror=1>' });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<img src=x');
    expect(mail.html).toContain('&lt;script&gt;');
  });

  it('sem nome de empresa usa "sua empresa"', () => {
    expect(welcomeAccessEmail({ ...base, companyName: null }).text).toContain('sua empresa');
  });
});

describe('e-mail do codigo de recuperacao', () => {
  it('leva o codigo e a validade, sem link com token', () => {
    const mail = passwordResetCodeEmail({ name: 'Ana', code: '482913', minutes: 30 });
    expect(mail.text).toContain('482913');
    expect(mail.html).toContain('482913');
    expect(mail.text).toContain('30 minutos');
    expect(mail.html).not.toContain('token=');
  });
});

describe('e-mail de chamado aberto', () => {
  it('traz o protocolo e o assunto', () => {
    const mail = supportTicketOpenedEmail({ name: 'Ana', protocol: '202610211020121', title: 'Erro ao bater ponto' });
    expect(mail.subject).toContain('202610211020121');
    expect(mail.html).toContain('Erro ao bater ponto');
  });

  it('escapa o assunto digitado pelo cliente', () => {
    expect(supportTicketOpenedEmail({ protocol: '1', title: '<b>oi</b>' }).html).not.toContain('<b>oi</b>');
  });
});

describe('AccessCredentialsService', () => {
  const input = { to: 'ana@padaria.com', name: 'Ana', companyName: 'Padaria', temporaryPassword: 'Ab3kQz', expiresAt };

  it('envia o e-mail para o proprio usuario e informa emailSent', async () => {
    const send = vi.fn().mockResolvedValue({ sent: true, provider: 'resend' });
    const result = await new AccessCredentialsService({ send } as any).sendAccess(input);
    expect(result).toEqual({ emailSent: true });
    expect(send.mock.calls[0][0]).toBe('ana@padaria.com');
    expect(send.mock.calls[0][1].text).toContain('Ab3kQz');
  });

  it('provedor fora do ar: nao lanca, devolve emailSent=false e o resultado nunca traz a senha', async () => {
    const send = vi.fn().mockResolvedValue({ sent: false, provider: 'none' });
    const result = await new AccessCredentialsService({ send } as any).sendAccess(input);
    expect(result).toEqual({ emailSent: false });
    expect(JSON.stringify(result)).not.toContain('Ab3kQz');
  });

  it('usuario sem e-mail valido: nao tenta enviar', async () => {
    const send = vi.fn();
    expect(await new AccessCredentialsService({ send } as any).sendAccess({ ...input, to: ' ' })).toEqual({ emailSent: false });
    expect(send).not.toHaveBeenCalled();
  });
});
