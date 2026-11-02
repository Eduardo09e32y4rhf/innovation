import { describe, expect, it, vi } from 'vitest';
import { RecruitmentPrivacyService } from './recruitment-privacy.service';

describe('RS-C-11: desistência não gera e-mail de reprovação', () => {
  it('não envia devolutiva quando o código é DESISTENCIA', async () => {
    const mail = { send: vi.fn() };
    const prisma: any = { application: { findUnique: vi.fn().mockResolvedValue({ id: 'a1', status: 'REJECTED', rejectionCode: 'DESISTENCIA', anonymizedAt: null, candidate: { email: 'a@b.c', name: 'A' }, job: { title: 'J', company: { name: 'C' } }, companyId: 'c1' }) }, applicationEvent: { count: vi.fn().mockResolvedValue(0) } };
    await new RecruitmentPrivacyService(prisma, mail as any, {} as any).afterRejected('a1');
    expect(mail.send).not.toHaveBeenCalled();
  });
});
