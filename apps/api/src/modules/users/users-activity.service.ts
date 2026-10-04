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
    const company = await this.prisma.company.findUnique({ where: { id: subject.companyId }, select: { name: true } });
    const pdfkit = await import('pdfkit');
    const doc = new pdfkit.default({ margin: 30, size: 'A4', layout: 'landscape', bufferPages: true });
    const sink = createPdfSink();
    doc.pipe(sink.stream);

    const W = doc.page.width - 60;
    const cols = [{ label: 'Data e hora', w: 92 }, { label: 'IP', w: 84 }, { label: 'Tipo', w: 58 }, { label: 'O que aconteceu', w: 190 }, { label: 'Detalhes (tinha → ficou)', w: W - 424 }];
    const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const brand = '#8b00c5';

    const header = () => {
      doc.rect(30, 24, W, 58).fill('#f5ecfb');
      doc.fillColor(brand).font('Helvetica-Bold').fontSize(14).text('Histórico de atividade do usuário', 40, 32);
      doc.fillColor('#333').font('Helvetica').fontSize(9)
        .text(`Usuário: ${subject.name}   |   E-mail: ${subject.email}   |   Matrícula: ${subject.employee?.registration ?? 'não vinculada'}`, 40, 52)
        .text(`Empresa: ${company?.name ?? '-'}   |   Período: últimos ${period} dias   |   Gerado em ${fmt(new Date().toISOString())}   |   ${items.length} registro(s)`, 40, 66);
      let x = 30;
      const y = 92;
      doc.rect(30, y, W, 18).fill(brand);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
      for (const col of cols) { doc.text(col.label, x + 4, y + 5, { width: col.w - 8 }); x += col.w; }
      doc.y = y + 22;
    };
    header();
    doc.on('pageAdded', header);

    doc.font('Helvetica').fontSize(7.5).fillColor('#111');
    if (!items.length) doc.text('Nenhum registro no período.', 34, doc.y + 6);
    let zebra = false;
    for (const item of items) {
      const detail = [
        item.target ? `Página/recurso: ${item.target}` : '',
        ...item.changes.map((c) => `${c.field}: ${c.from ?? '(vazio)'} → ${c.to ?? '(vazio)'}`),
        item.by ? `Por: ${item.by}` : '',
      ].filter(Boolean).join('\n') || '—';
      const cells = [fmt(item.at), item.ip ?? '—', ACTIVITY_TYPE_LABEL[item.type], item.title, detail];
      const heights = cells.map((text, i) => doc.heightOfString(text, { width: cols[i].w - 8 }));
      const rowH = Math.max(...heights) + 8;
      if (doc.y + rowH > doc.page.height - 40) doc.addPage();
      const y = doc.y;
      if (zebra) doc.rect(30, y - 2, W, rowH).fill('#faf7fd');
      zebra = !zebra;
      doc.fillColor('#111');
      let x = 30;
      cells.forEach((text, i) => { doc.text(text, x + 4, y + 2, { width: cols[i].w - 8 }); x += cols[i].w; });
      doc.y = y + rowH;
    }
    if (truncated) doc.moveDown().fillColor('#a00').text(`Exibindo os ${MAX_ROWS} registros mais recentes.`, 34);

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(range.start + i);
      doc.fillColor('#777').fontSize(7).text(`Documento confidencial — contém dados pessoais (LGPD) • Página ${i + 1} de ${range.count}`, 30, doc.page.height - 26, { width: W, align: 'center' });
    }
    doc.end();
    sendPdf(res, await sink.done, `historico-${safeFileName(subject.name, 'usuario')}-${period}d.pdf`);
  }
}
