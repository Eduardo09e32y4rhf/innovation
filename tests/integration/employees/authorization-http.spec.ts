import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { PrismaService } from '../../../apps/api/src/database/prisma.service';
import { EmployeesController } from '../../../apps/api/src/modules/employees/employees.controller';
import { EmployeesService } from '../../../apps/api/src/modules/employees/employees.service';
import { EmployeesRepository } from '../../../apps/api/src/modules/employees/employees.repository';
import { EmployeeDocumentsService } from '../../../apps/api/src/modules/employees/employee-documents.service';
import { JwtAuthGuard } from '../../../apps/api/src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../apps/api/src/common/guards/roles.guard';

describe('Funcionários: HTTP autenticado com PostgreSQL real', () => {
  const prisma = new PrismaService();
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  const companyIds: string[] = [];
  const tokens: Record<string, string> = {};
  const tag = randomUUID();
  let app: INestApplication;
  let employeeId: string;
  let foreignId: string;
  let protectedEmail: string;

  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || !target.pathname.includes('test')) throw new Error('Banco local de testes obrigatório.');
    await prisma.$connect();
    for (const label of ['A', 'B']) {
      const company = await prisma.company.create({ data: { name: `employees-${tag}-${label}` } });
      companyIds.push(company.id);
    }
    const users: Record<string, any> = {};
    for (const role of ['RH', 'GESTOR', 'DEV'] as const) {
      const user = await prisma.user.create({ data: { companyId: companyIds[0], name: role, email: `${tag}-${role.toLowerCase()}@example.test`, role, passwordHash: 'fixture-not-for-login', passwordChangedAt: new Date() } });
      users[role] = user;
      const family = randomUUID();
      await prisma.refreshSession.create({ data: { userId: user.id, family, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } });
      tokens[role] = jwt.sign({ purpose: 'access', sub: user.id, sessionFamily: family, passwordVersion: user.passwordChangedAt.getTime() });
    }
    protectedEmail = users.DEV.email;
    const boss = await prisma.employee.create({ data: { companyId: companyIds[0], userId: users.GESTOR.id, name: 'Gestor', position: 'Gestor', department: 'Equipe', admissionDate: new Date() } });
    const employee = await prisma.employee.create({ data: { companyId: companyIds[0], name: 'Subordinado', managerId: boss.id, position: 'Analista', department: 'Equipe', admissionDate: new Date(), cpf: `fixture-${tag}`, salary: 9999, bankAccount: 'restricted', motherName: 'restricted' } });
    employeeId = employee.id;
    const foreign = await prisma.employee.create({ data: { companyId: companyIds[1], name: 'Empresa B', position: 'Analista', department: 'Equipe', admissionDate: new Date() } });
    foreignId = foreign.id;
    const repository = new EmployeesRepository(prisma);
    const module = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: EmployeesService, useValue: new EmployeesService(repository, { create: vi.fn() } as never) },
        { provide: EmployeeDocumentsService, useValue: {} },
        JwtAuthGuard, RolesGuard,
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    // Company cascade removes fixtures, users, refresh sessions and employees together.
    if (companyIds.length) await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.$disconnect();
  });

  it('RH pode criar funcionário comum, mas a rota exige autenticação', async () => {
    const input = { name: 'Cadastro autorizado', department: 'Equipe', position: 'Analista', accessEnabled: 'NO' };
    await request(app.getHttpServer()).post('/employees').send(input).expect(401);
    const response = await request(app.getHttpServer()).post('/employees').auth(tokens.RH, { type: 'bearer' }).send(input).expect(201);
    const stored = await prisma.employee.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(stored.companyId).toBe(companyIds[0]);
    expect(stored.name).toBe(input.name);
  });

  it('RH não cria ADMIN: 403 e zero funcionário/usuário adicional', async () => {
    const before = await prisma.employee.count({ where: { companyId: companyIds[0] } });
    await request(app.getHttpServer()).post('/employees').auth(tokens.RH, { type: 'bearer' }).send({ name: 'Escalada', email: `${tag}-escalada@example.test`, accessEnabled: 'YES', accessProfile: 'ADMIN' }).expect(403);
    expect(await prisma.employee.count({ where: { companyId: companyIds[0] } })).toBe(before);
    expect(await prisma.user.count({ where: { email: `${tag}-escalada@example.test` } })).toBe(0);
  });

  it('RH não reaproveita DEV pelo e-mail, e PATCH não muda o funcionário', async () => {
    await request(app.getHttpServer()).patch(`/employees/${employeeId}`).auth(tokens.RH, { type: 'bearer' }).send({ name: 'Tomada', email: protectedEmail, accessEnabled: 'YES', accessProfile: 'FUNCIONARIO' }).expect(403);
    expect((await prisma.employee.findUniqueOrThrow({ where: { id: employeeId } })).name).toBe('Subordinado');
    expect((await prisma.user.findUniqueOrThrow({ where: { email: protectedEmail } })).role).toBe('DEV');
  });

  it('JSON de GESTOR não contém dados pessoais, clínicos ou bancários; dossiê completo é negado', async () => {
    for (const path of ['/employees', `/employees/${employeeId}`]) {
      const response = await request(app.getHttpServer()).get(path).auth(tokens.GESTOR, { type: 'bearer' }).expect(200);
      const body = JSON.stringify(response.body);
      for (const field of ['salary', 'cpf', 'bankAccount', 'motherName', 'passwordHash']) expect(body).not.toContain(`"${field}"`);
    }
    await request(app.getHttpServer()).get(`/employees/${employeeId}/dossier`).auth(tokens.GESTOR, { type: 'bearer' }).expect(403);
  });

  it('empresa A não acessa nem associa gestor da empresa B', async () => {
    await request(app.getHttpServer()).get(`/employees/${foreignId}`).auth(tokens.RH, { type: 'bearer' }).expect(404);
    await request(app.getHttpServer()).patch(`/employees/${employeeId}`).auth(tokens.RH, { type: 'bearer' }).send({ managerId: foreignId }).expect(400);
  });

  it('página inválida e salário negativo retornam 400', async () => {
    await request(app.getHttpServer()).get('/employees?page=abc').auth(tokens.RH, { type: 'bearer' }).expect(400);
    await request(app.getHttpServer()).patch(`/employees/${employeeId}`).auth(tokens.RH, { type: 'bearer' }).send({ salary: -1 }).expect(400);
    expect(Number((await prisma.employee.findUniqueOrThrow({ where: { id: employeeId } })).salary)).toBe(9999);
  });
});
