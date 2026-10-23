import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

describe('recuperação de senha por e-mail', () => {
  it('envia o mesmo código de seis dígitos que será validado', async () => {
    const repository = {
      findUserWithEmployeeByEmail: vi.fn().mockResolvedValue({
        id: 'user-1', companyId: 'company-1', email: 'pessoa@empresa.com', name: 'Pessoa', isActive: true, company: {},
      }),
      setResetCode: vi.fn(),
      createAuditLog: vi.fn(),
    };
    const mail = { send: vi.fn().mockResolvedValue({ sent: true, provider: 'smtp' }) };
    const notificationsService = { createSystemNotice: vi.fn() };
    const service = Object.create(AuthService.prototype) as any;
    service.repository = repository;
    service.mail = mail;
    service.notificationsService = notificationsService;
    service.resolveRole = () => 'FUNCIONARIO';
    service.canAccessCompany = () => true;

    await service.requestPasswordReset({ email: 'pessoa@empresa.com' }, {});

    expect(repository.setResetCode).toHaveBeenCalledOnce();
    const code = repository.setResetCode.mock.calls[0][1];
    expect(code).toMatch(/^\d{6}$/);
    expect(mail.send).toHaveBeenCalledOnce();
    expect(mail.send.mock.calls[0][0]).toBe('pessoa@empresa.com');
    expect(mail.send.mock.calls[0][1].text).toContain(code);
    expect(mail.send.mock.calls[0][1].text).not.toContain('token=');
    expect(notificationsService.createSystemNotice).not.toHaveBeenCalled();
  });
});
