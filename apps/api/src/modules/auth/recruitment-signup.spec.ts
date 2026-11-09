import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { RegisterCompanyDto } from './dto/register-company.dto';

describe('cadastro de empreendedor e recrutador', () => {
  it('a escolha nao permite criar perfis internos ou elevar permissoes', async () => {
    const dto = plainToInstance(RegisterCompanyDto, { recruitmentAccountType: 'DEV' });
    expect((await validate(dto)).some((error) => error.property === 'recruitmentAccountType')).toBe(true);
    const create = vi.fn(async ({ data }: any) => data);
    const repository = new AuthRepository({ company: { create } } as any);
    const company = await repository.createCompanyWithAdmin({ companyName: 'Loja', document: '11222333000181', name: 'Ana', email: 'ana@example.com', passwordHash: 'hash', maxUsers: 1, maxEmployees: 0, activeModules: ['recruitment'], isFree: false });
    expect(company.recruitmentAccountType).toBe('EMPLOYER');
    expect(company.users.create.role).toBe('ADMIN');
    expect(company.email).toBe('ana@example.com');
  });
  it('a primeira sessao usa o estado ativo do teste em vez do estado suspenso da criacao', async () => {
    const jwt = { signAsync: vi.fn(async () => 'access') };
    const company = { id: 'c1', name: 'Loja', status: 'ACTIVE', billingStatus: 'TRIAL', isActive: true, recruitmentAccountType: 'EMPLOYER', activeModules: ['recruitment'] };
    const sessions = { familyOf: vi.fn(async () => null), create: vi.fn(async () => ({ token: 'refresh', session: { family: 'f1' } })) };
    const service: any = new AuthService({ findCompanyAuthContext: async () => company } as any, jwt as any, {} as any, {} as any, {} as any, sessions as any, {} as any, {} as any, {} as any);
    const result = await service.buildAuthResponse({ sub: 'u1', companyId: 'c1', role: 'ADMIN', email: 'ana@example.com', companyStatus: 'SUSPENDED', billingStatus: 'PENDING_PAYMENT' });
    expect(result.user).toMatchObject({ companyStatus: 'ACTIVE', billingStatus: 'TRIAL', role: 'ADMIN' });
    expect(result.company).toMatchObject({ recruitmentAccountType: 'EMPLOYER', activeModules: ['recruitment'] });
    expect(jwt.signAsync).toHaveBeenCalledWith(expect.objectContaining({ companyStatus: 'ACTIVE', billingStatus: 'TRIAL' }));
  });
  it('a vitrine usa o prazo configurado no servidor e identifica os planos liberados', async () => {
    const service: any = new AuthService({ listPublicPlans: async () => [
      { id: 'rs', code: 'RS', isFree: false, price: 99, baseMonthlyPrice: 99, includedUnits: 1 },
      { id: 'rh', code: 'BASICO', isFree: true, price: 0 },
    ] } as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    const result = await service.publicPlans();
    expect(result[0]).toMatchObject({ signupEnabled: true, trialDays: 30 });
    expect(result[1]).toMatchObject({ signupEnabled: false, trialDays: 0 });
  });
});
