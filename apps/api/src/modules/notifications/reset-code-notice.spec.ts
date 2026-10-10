import { resetNoticeRoles } from './notice-rules';
import { NotificationsService } from './notifications.service';

describe('quem recebe o codigo de recuperacao de senha', () => {
  it('colaborador, consulta, gestor e RH-R&S: RH e ADMIN', () => {
    for (const role of ['FUNCIONARIO', 'CONSULTA', 'GESTOR', 'RH_RS']) expect(resetNoticeRoles(role)).toEqual(['RH', 'ADMIN']);
  });

  it('RH: so o ADMIN (RH nao libera o codigo de outro RH)', () => {
    expect(resetNoticeRoles('RH')).toEqual(['ADMIN']);
  });

  it('ADMIN e perfis da plataforma nao usam codigo por aviso (e-mail ou DEV)', () => {
    for (const role of ['ADMIN', 'CEO', 'CONTABIL', 'COMERCIAL', 'DEV', 'QUALQUER']) expect(resetNoticeRoles(role)).toEqual([]);
  });

  it('nunca inclui GESTOR: o gestor veria o codigo de qualquer colega e tomaria a conta do ADMIN', () => {
    for (const role of ['FUNCIONARIO', 'CONSULTA', 'GESTOR', 'RH_RS', 'RH', 'ADMIN']) expect(resetNoticeRoles(role)).not.toContain('GESTOR');
  });
});

describe('aviso interno do sistema (SYSTEM_NOTICE)', () => {
  function service(users: Array<{ id: string; employee: { id: string } | null }>) {
    const created: any[] = [];
    let queried: any;
    const prisma = {
      user: { findMany: async (args: any) => { queried = args; return users; } },
      notification: { create: async ({ data }: any) => { created.push(data); return { id: 'n1', ...data }; } },
    } as any;
    return { svc: new NotificationsService(prisma), created, queried: () => queried };
  }

  it('cria o aviso SYSTEM_NOTICE para os perfis pedidos, sem o proprio solicitante', async () => {
    const { svc, created, queried } = service([{ id: 'rh1', employee: { id: 'e1' } }, { id: 'adm1', employee: null }]);
    const result = await svc.createSystemNotice('c1', { title: 'Codigo', message: 'm', priority: 'HIGH', targetRoles: ['RH', 'ADMIN'], excludeUserId: 'user-que-pediu', extraJson: { resetCode: 'ABC123' } });
    expect(result.count).toBe(2);
    expect(created[0]).toMatchObject({ type: 'SYSTEM_NOTICE', companyId: 'c1', priority: 'HIGH', status: 'SENT', extraJson: { resetCode: 'ABC123' } });
    expect(created[0].recipients.create.map((r: any) => r.userId)).toEqual(['rh1', 'adm1']);
    expect(queried().where).toMatchObject({ companyId: 'c1', isActive: true, role: { in: ['RH', 'ADMIN'] }, id: { not: 'user-que-pediu' } });
  });

  it('sem ninguem ativo nos perfis, nao cria aviso e avisa que nao houve destinatario', async () => {
    const { svc, created } = service([]);
    expect(await svc.createSystemNotice('c1', { title: 't', message: 'm', targetRoles: ['ADMIN'] })).toEqual({ count: 0 });
    expect(created).toHaveLength(0);
  });
});
