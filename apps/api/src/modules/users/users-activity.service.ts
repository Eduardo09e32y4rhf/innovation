import { PdfReport } from '../../common/pdf/pdf-report';
import { BadRequestException, Injectable } from '@nestjs/common';
import { createPdfSink, safeFileName, sendPdf } from '../../common/pdf/pdf-response';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { ACTIVITY_TYPE_LABEL, ActivityItem, describeAudit } from './user-activity';
import { UsersService } from './users.service';

export interface RequestMeta { ip?: string; userAgent?: string }
const MAX_ROWS = 2000;

@Injectable()
export class UsersActivityService {
  constructor(private readonly prisma: PrismaService, private readonly users: UsersService) {}

  /** Grava o acesso a uma página (chamado pelo painel a cada troca de rota). */
  async recordPageView(actor: JwtUser, path: string, meta: RequestMeta) {
    const clean = String(path ?? '').split('?')[0].trim();
    if (!clean.startsWith('/') || clean.length > 200 || /[\u0000-\u001f]/.test(clean)) throw new BadRequestException('Caminho invalido.');
    await this.prisma.auditLog.create({
      data: { companyId: actor.companyId, userId: actor.sub, action: 'PAGE_VIEW', entity: 'Page', entityId: null, metadata: { path: clean }, ipAddress: meta.ip ?? null, userAgent: meta.userAgent?.slice(0, 300) ?? null },
    });
    return { recorded: true };
  }

  private async load(companyId: string, actor: JwtUser, userId: string, query: { days?: number; since?: string; limit?: number }) {
    const subject = await this.users.get(companyId, actor, userId); // aplica escopo e permissão
    const days = Math.min(Math.max(Number(query.days) || 30, 1), 365);
    const limit = Math.min(Math.max(Number(query.limit) || 300, 1), MAX_ROWS);
    const from = new Date(Date.now() - days * 86_400_000);
    const since = query.since ? new Date(query.since) : null;
    const rows = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: since && !Number.isNaN(since.getTime()) && since > from ? since : from },
        OR: [{ userId }, { entity: 'User', entityId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, action: true, entity: true, entityId: true, metadata: true, ipAddress: true, createdAt: true },
    });
    const seen = new Set<string>();
    const items: ActivityItem[] = [];
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      items.push(describeAudit(row, userId));
    }
    return { subject, days, items, truncated: rows.length >= limit };
  }

  async activity(companyId: string, actor: JwtUser, userId: string, query: { days?: number; since?: string; limit?: number }) {
    const { subject, days, items, truncated } = await this.load(companyId, actor, userId, query);
    return {
      user: { id: subject.id, name: subject.name, email: subject.email, registration: subject.employee?.registration ?? null, role: subject.role },
      days, total: items.length, truncated, generatedAt: new Date().toISOString(), items,
    };
  }

  async pdf(companyId: string, actor: JwtUser, userId: string, days: number, res: unknown) {
    const { subject, items, days: period, truncated } = await this.load(companyId, actor, userId, { days, limit: MAX_ROWS });
    const company = await this.prisma.company.findUnique({ where: { id: subject.companyId }, select: { name: true, document: true, logoUrl: true } });
    const report = await PdfReport.create({
      title: 'Histórico de atividade', subtitle: `Últimos ${period} dias`, brand: { name: company?.name ?? 'Empresa', document: company?.document, logoUrl: company?.logoUrl },
      footerNote: 'Documento confidencial: contém dados pessoais (LGPD).', footerId: `Usuário ${subject.email}`,
    });
    const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    report.fields([
      ['Usuário', subject.name], ['E-mail', subject.email], ['Matrícula', subject.employee?.registration ?? 'não vinculada'], ['Registros', String(items.length)],
    ]);
    report.section('Atividade', truncated ? `Exibindo os ${MAX_ROWS} registros mais recentes` : undefined);
    report.table(
      [{ label: 'Data e hora', width: 82 }, { label: 'IP', width: 72 }, { label: 'Tipo', width: 55 }, { label: 'O que aconteceu', width: 130 }, { label: 'Detalhes (tinha → ficou)', width: 176 }],
      items.map((item) => [
        when(item.at), item.ip ?? '—', ACTIVITY_TYPE_LABEL[item.type], item.title,
        [
          item.target ? `Página/recurso: ${item.target}` : '',
          ...item.changes.map((c) => `${c.field}: ${c.from ?? '(vazio)'} → ${c.to ?? '(vazio)'}`),
          item.by ? `Por: ${item.by}` : '',
        ].filter(Boolean).join('\n') || '—',
      ]),
      { fontSize: 7.5, emptyText: 'Nenhum registro no período.' },
    );
    sendPdf(res, await report.finish(), `historico-${safeFileName(subject.name, 'usuario')}-${period}d.pdf`);
  }
}
