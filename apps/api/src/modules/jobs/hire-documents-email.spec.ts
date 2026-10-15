import { describe, expect, it, vi } from 'vitest';
import { RecruitmentDocumentsService } from './recruitment-documents.service';
import { candidateHiredEmail } from './recruitment-mails';

describe('e-mail de contratação', () => {
  it('leva o link de documentos e a lista pedida', () => {
    const mail = candidateHiredEmail({ name: 'Ana', company: 'Acme', jobTitle: 'Vendedor', documentsUrl: 'https://x.test/carreiras/documentos/abc', items: ['CPF'], expires: '01/01/2027' });
    expect(mail.html).toContain('https://x.test/carreiras/documentos/abc');
    expect(mail.text).toContain('CPF');
    expect(mail.html).toContain('Bem-vindo(a) à Acme');
    expect(mail.html).toContain('connect RH');
  });
  it('sendHireWelcome cria o link, envia e registra na linha do tempo', async () => {
    process.env.APP_URL = 'https://x.test';
    const create = vi.fn().mockResolvedValue({});
    const event = vi.fn().mockResolvedValue({});
    const prisma: any = {
      application: { findFirst: vi.fn().mockResolvedValue({ anonymizedAt: null, candidate: { name: 'Ana', email: 'a@b.c' }, job: { title: 'V', company: { name: 'Acme' } } }) },
      recruitmentDocumentRequest: { create },
      applicationEvent: { create: event },
    };
    const mail: any = { send: vi.fn().mockResolvedValue({ sent: true }) };
    const service = new RecruitmentDocumentsService(prisma, {} as any, {} as any, {} as any, mail);
    expect(await service.sendHireWelcome('c1', 'u1', 'a1', '2027-01-10')).toBe(true);
    expect(create).toHaveBeenCalled();
    expect(mail.send.mock.calls[0][1].html).toContain('/carreiras/documentos/');
    expect(event.mock.calls[0][0].data.type).toBe('HIRED_EMAIL');
  });
});
