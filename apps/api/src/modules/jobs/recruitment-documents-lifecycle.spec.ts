import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { RecruitmentDocumentsService } from './recruitment-documents.service';
import { hashAccessToken } from './recruitment-documents.rules';

const actor = { sub: 'rh-1', role: 'RH' };
const DAY = 86_400_000;

function build(opts: { doc?: any; app?: any; requests?: any[]; docs?: any[]; expiring?: any[]; claim?: number } = {}) {
  const created: any[] = [];
  const mails: Array<{ to: string; subject: string; html: string; text: string }> = [];
  const app = opts.app ?? { forwardedAt: null, anonymizedAt: null, candidate: { name: 'Ana', email: 'ana@x.com' }, job: { title: 'Dev', company: { name: 'Acme' } } };
  const prisma: any = {
    recruitmentDocument: {
      findFirst: vi.fn(async () => opts.doc ?? { id: 'd1', applicationId: 'app-1', status: 'RECEIVED', supersededAt: null, label: 'RG ou CNH', docType: null }),
      findMany: vi.fn(async (a: any) => (a.where?.status === 'APPROVED' ? opts.expiring ?? [] : opts.docs ?? [])),
      updateMany: vi.fn(async () => ({ count: opts.claim ?? 1 })),
    },
    recruitmentDocumentRequest: {
      create: vi.fn(async (a: any) => { created.push(a.data); return { id: `new-${created.length}`, items: a.data.items, expiresAt: a.data.expiresAt }; }),
      findMany: vi.fn(async () => opts.requests ?? []),
      updateMany: vi.fn(async () => ({ count: opts.claim ?? 1 })),
      findFirst: vi.fn(async () => ({ id: 'req-1', applicationId: 'app-1', items: ['RG ou CNH', 'CPF'] })),
    },
    application: { findFirst: vi.fn(async () => ({ ...app, companyId: 'c1', job: { ...app.job, requiredDocuments: null, employmentType: 'CLT' } })) },
    auditLog: { create: vi.fn(async () => ({})) },
  };
  const mail: any = { send: vi.fn(async (to: string, c: any) => { mails.push({ to, ...c }); return { sent: true }; }) };
  const notifier: any = { notify: vi.fn(async () => undefined) };
  const scope: any = { assertApplication: vi.fn(async () => undefined) };
  const svc = new RecruitmentDocumentsService(prisma, {} as any, {} as any, scope, mail, undefined, notifier);
  return { svc, prisma, mail, mails, notifier, created };
}

beforeEach(() => { process.env.APP_URL = 'https://app.test'; });
afterEach(() => { delete process.env.APP_URL; });

describe('e-mail ao candidato na conferencia (RS-D-07)', () => {
  it('devolvido: manda motivo e link novo; so o hash do link fica no banco', async () => {
    const { svc, mails, created } = build();
    const out = await svc.review('c1', actor, 'd1', { decision: 'RETURNED', reason: 'Foto cortada, envie inteira' });
    expect(out.emailed).toBe(true);
    expect(mails[0].to).toBe('ana@x.com');
    expect(mails[0].subject).toContain('devolvido');
    expect(mails[0].html).toContain('Foto cortada, envie inteira');
    const url = /https:\/\/app\.test\/carreiras\/documentos\/([A-Za-z0-9_-]{43})/.exec(mails[0].text)!;
    expect(url).not.toBeNull();
    expect(created[0].tokenHash).toBe(hashAccessToken(url[1]));
    expect(JSON.stringify(created[0])).not.toContain(url[1]);
  });
  it('aprovado: avisa e diz quantos faltam, sem link', async () => {
    const { svc, mails } = build({ requests: [{ items: ['RG ou CNH', 'CPF'] }] });
    await svc.review('c1', actor, 'd1', { decision: 'APPROVED' });
    expect(mails[0].subject).toContain('aprovado');
    expect(mails[0].text).not.toContain('carreiras/documentos');
  });
  it('falha do e-mail nao desfaz a conferencia', async () => {
    const { svc, mail } = build();
    mail.send.mockRejectedValue(new Error('smtp'));
    await expect(svc.review('c1', actor, 'd1', { decision: 'RETURNED', reason: 'Ilegivel demais' })).resolves.toMatchObject({ status: 'RETURNED', emailed: false });
  });
});

describe('vencimento na conferencia (RS-D-11)', () => {
  it('CNH exige vencimento para aprovar e nao aceita vencida', async () => {
    const doc = { id: 'd1', applicationId: 'app-1', status: 'RECEIVED', supersededAt: null, label: 'CNH categoria exigida pela vaga', docType: null };
    const { svc, prisma } = build({ doc });
    await expect(svc.review('c1', actor, 'd1', { decision: 'APPROVED' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.review('c1', actor, 'd1', { decision: 'APPROVED', expiresAt: '2020-01-01' })).rejects.toThrow(/vencido/);
    expect(prisma.recruitmentDocument.updateMany).not.toHaveBeenCalled();
    await svc.review('c1', actor, 'd1', { decision: 'APPROVED', expiresAt: new Date(Date.now() + 200 * DAY).toISOString() });
    expect(prisma.recruitmentDocument.updateMany.mock.calls[0][0].data.expiresAt).toBeInstanceOf(Date);
  });
  it('alerta o RH uma vez dos documentos que vencem em 30 dias e dos vencidos', async () => {
    const now = new Date('2026-11-10T12:00:00Z');
    const expiring = [
      { id: 'a', companyId: 'c1', applicationId: 'app-1', label: 'ASO admissional', expiresAt: new Date('2026-11-20T00:00:00Z'), reviewedById: 'rh-1', application: { jobId: 'j1', candidate: { name: 'Ana' } } },
      { id: 'b', companyId: 'c1', applicationId: 'app-2', label: 'CNH', expiresAt: new Date('2026-11-01T00:00:00Z'), reviewedById: null, application: { jobId: 'j1', candidate: { name: 'Bia' } } },
    ];
    const { svc, notifier, prisma } = build({ expiring });
    expect(await svc.alertExpiringDocuments(now)).toEqual({ alerted: 2 });
    expect(notifier.notify).toHaveBeenCalledTimes(2);
    expect(notifier.notify.mock.calls[1][0]).toMatchObject({ title: 'Documento vencido', priority: 'HIGH' });
    expect(prisma.recruitmentDocument.findMany.mock.calls[0][0].where).toMatchObject({ expiryAlertedAt: null, status: 'APPROVED' });
    // outra instancia ja marcou: nao alerta de novo
    const raced = build({ expiring, claim: 0 });
    expect(await raced.svc.alertExpiringDocuments(now)).toEqual({ alerted: 0 });
  });
});

describe('lembretes de link D-3 e D-1 (RS-D-07)', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  const request = (extra: any = {}) => ({ id: 'req-1', companyId: 'c1', applicationId: 'app-1', items: ['RG ou CNH', 'CPF'], expiresAt: new Date(now.getTime() + 3 * DAY - 1000), createdById: 'rh-1', reminderD3At: null, reminderD1At: null, application: { jobId: 'j1', candidate: { name: 'Ana', email: 'ana@x.com' }, job: { title: 'Dev', company: { name: 'Acme' } } }, ...extra });

  it('D-3: lembra so o que falta (sem envio ou devolvido), com link novo, e avisa o RH', async () => {
    const { svc, mails, notifier, created } = build({ requests: [request()], docs: [{ label: 'RG ou CNH', status: 'APPROVED' }] });
    expect(await svc.sendLinkReminders(now)).toEqual({ reminded: 1 });
    expect(mails[0].subject).toMatch(/vence em 3 dias/);
    expect(mails[0].text).toContain('CPF');
    expect(mails[0].text).not.toMatch(/RG ou CNH/);
    expect(created[0]).toMatchObject({ reissuedFromId: 'req-1' });
    expect(created[0].reminderD1At).toBeInstanceOf(Date); // o link novo nao dispara outro lembrete
    expect(notifier.notify).toHaveBeenCalledTimes(1);
  });
  it('D-1 dispara mesmo apos o D-3; marco ja enviado nao repete', async () => {
    const dayBefore = request({ expiresAt: new Date(now.getTime() + 12 * 3600_000), reminderD3At: new Date(now.getTime() - 2 * DAY) });
    const first = build({ requests: [dayBefore], docs: [] });
    expect(await first.svc.sendLinkReminders(now)).toEqual({ reminded: 1 });
    expect(first.mails[0].subject).toMatch(/vence amanhã/);
    const done = build({ requests: [request({ reminderD3At: now })], docs: [] });
    expect(await done.svc.sendLinkReminders(now)).toEqual({ reminded: 0 });
    const doneD1 = build({ requests: [dayBefore.reminderD1At === null ? { ...dayBefore, reminderD1At: now } : dayBefore], docs: [] });
    expect(await doneD1.svc.sendLinkReminders(now)).toEqual({ reminded: 0 });
  });
  it('sem pendencia do candidato (tudo aprovado ou aguardando conferencia) nao manda lembrete', async () => {
    const { svc, mails } = build({ requests: [request()], docs: [{ label: 'RG ou CNH', status: 'APPROVED' }, { label: 'CPF', status: 'RECEIVED' }] });
    expect(await svc.sendLinkReminders(now)).toEqual({ reminded: 0 });
    expect(mails).toHaveLength(0);
  });
  it('varios links da mesma candidatura geram um unico lembrete (o mais recente)', async () => {
    const newer = request({ id: 'req-2', expiresAt: new Date(now.getTime() + 2 * DAY) });
    const older = request({ id: 'req-1', expiresAt: new Date(now.getTime() + DAY) });
    const { svc, mails } = build({ requests: [newer, older], docs: [] });
    expect(await svc.sendLinkReminders(now)).toEqual({ reminded: 1 });
    expect(mails).toHaveLength(1);
  });
  it('outra instancia ja reivindicou o marco: nao envia duas vezes', async () => {
    const { svc, mails } = build({ requests: [request()], docs: [], claim: 0 });
    expect(await svc.sendLinkReminders(now)).toEqual({ reminded: 0 });
    expect(mails).toHaveLength(0);
  });
});

describe('reemitir link sem perder o historico (RS-C-05)', () => {
  it('cria link novo encadeado, revoga o antigo e nao apaga documentos; encaminhada recusa', async () => {
    const { svc, prisma, created, mails } = build();
    const out = await svc.reissueRequest('c1', actor, 'req-1', { sendEmail: true, expiresInDays: 10 });
    expect(created[0]).toMatchObject({ reissuedFromId: 'req-1', items: ['RG ou CNH', 'CPF'] });
    expect(prisma.recruitmentDocumentRequest.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 'req-1' }, data: { revokedAt: expect.any(Date) } });
    expect(prisma.recruitmentDocument.updateMany).not.toHaveBeenCalled();
    expect(out.path).toMatch(/^\/carreiras\/documentos\//);
    expect(out.emailed).toBe(true);
    expect(mails).toHaveLength(1);
    const fwd = build({ app: { forwardedAt: new Date(), anonymizedAt: null, candidate: { name: 'A', email: 'a@x.com' }, job: { title: 'x', company: { name: 'y' } } } });
    await expect(fwd.svc.reissueRequest('c1', actor, 'req-1')).rejects.toBeInstanceOf(ConflictException);
  });
});
