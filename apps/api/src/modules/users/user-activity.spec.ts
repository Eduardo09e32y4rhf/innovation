import { describeAudit, diffRecords, type AuditRow } from './user-activity';

const row = (over: Partial<AuditRow>): AuditRow => ({
  id: 'a1', action: 'PAGE_VIEW', entity: 'Page', entityId: null, metadata: {}, ipAddress: '10.0.0.5', createdAt: new Date('2026-10-05T12:00:00.000Z'), ...over,
});

describe('diffRecords', () => {
  it('lista só o que mudou, com tinha → ficou', () => {
    const changes = diffRecords({ name: 'Ana', role: 'RH', isActive: true }, { name: 'Ana', role: 'GESTOR', isActive: false });
    expect(changes).toEqual([
      { field: 'Perfil', from: 'RH', to: 'Gestor' },
      { field: 'Acesso ativo', from: 'Sim', to: 'Não' },
    ]);
  });

  it('em listas mostra o que foi adicionado e o que foi retirado', () => {
    const changes = diffRecords({ customPermissions: ['a', 'b'] }, { customPermissions: ['b', 'c'] });
    expect(changes).toContainEqual({ field: 'Permissões personalizadas (adicionado)', from: null, to: 'c' });
    expect(changes).toContainEqual({ field: 'Permissões personalizadas (retirado)', from: 'a', to: null });
  });

  it('null e ausente são equivalentes', () => {
    expect(diffRecords({ x: null }, {})).toEqual([]);
  });
});

describe('describeAudit', () => {
  it('traduz acesso a página com IP e data', () => {
    const item = describeAudit(row({ metadata: { path: '/acme/dashboard/users' } }), 'u1');
    expect(item).toMatchObject({ type: 'PAGE', title: 'Acessou a página', target: '/acme/dashboard/users', ip: '10.0.0.5', at: '2026-10-05T12:00:00.000Z' });
  });

  it('traduz alteração de usuário com diferença e autor', () => {
    const item = describeAudit(row({ action: 'USER_UPDATED', entity: 'User', metadata: { previous: { role: 'RH' }, next: { role: 'ADMIN' }, requestedBy: 'rh@x.com' } }), 'u1');
    expect(item.type).toBe('CHANGE');
    expect(item.changes).toEqual([{ field: 'Perfil', from: 'RH', to: 'Administrador' }]);
    expect(item.by).toBe('rh@x.com');
  });

  it('traduz bloqueio com motivo', () => {
    const item = describeAudit(row({ action: 'USER_BLOCKED', entity: 'User', metadata: { reason: 'suspeita', requestedBy: 'adm@x.com' } }), 'u1');
    expect(item).toMatchObject({ type: 'ACCESS', title: 'Acesso bloqueado' });
    expect(item.changes).toContainEqual({ field: 'Motivo', from: null, to: 'suspeita' });
  });

  it('traduz escrita genérica do interceptor com os campos enviados', () => {
    const item = describeAudit(row({ action: 'PATCH /employees/:id', entity: 'Employees', metadata: { path: '/api/employees/9f1d1c1e-0000-4000-8000-000000000000', body: { position: 'Analista', department: 'TI', nested: { x: 1 } } } }), 'u1');
    expect(item.type).toBe('CHANGE');
    expect(item.title).toBe('Alterou em Funcionários');
    expect(item.changes.map((c) => c.field)).toEqual(['Cargo', 'Departamento']);
  });
});
