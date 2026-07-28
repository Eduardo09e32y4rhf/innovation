import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateManualContractDto } from './dto/create-manual-contract.dto';
import { UpdateManualContractDto } from './dto/update-manual-contract.dto';
import { ManualContractsRepository } from './manual-contracts.repository';
import { PlatformFinanceService } from '../finance/platform-finance.service';

@Injectable()
export class ManualContractsService {
  constructor(
    private readonly repository: ManualContractsRepository,
    private readonly finance: PlatformFinanceService,
  ) {}

  list(companyId?: string) {
    return this.repository.list(companyId);
  }

  async create(dto: CreateManualContractDto, actorId: string) {
    const company = await this.repository.findCompany(dto.companyId);
    if (!company) throw new NotFoundException('Empresa nao encontrada.');
    if (dto.planId && !(await this.repository.findPlan(dto.planId))) throw new NotFoundException('Plano nao encontrado.');
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('O fim da vigencia deve ser posterior ao inicio.');
    const contract = await this.repository.createWithActivation({ ...dto, startsAt, endsAt }, actorId);
    let billingSetupPending = false;
    try {
      const nextDueDate = new Date(startsAt);
      nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 1);
      await this.finance.ensureManualContractBilling(dto.companyId, nextDueDate);
    } catch {
      billingSetupPending = true;
    }
    return { ...contract, billingSetupPending };
  }

  async update(id: string, dto: UpdateManualContractDto, actorId: string) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Contrato manual nao encontrado.');
    if (dto.planId && !(await this.repository.findPlan(dto.planId))) throw new NotFoundException('Plano nao encontrado.');
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : current.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : current.endsAt;
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('O fim da vigencia deve ser posterior ao inicio.');
    return this.repository.update(id, { ...dto, startsAt, endsAt }, actorId);
  }

  async delete(id: string, actorId: string) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Contrato manual nao encontrado.');
    return this.repository.delete(id, actorId);
  }

  async streamPdf(id: string, actorId: string, res: any) {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundException('Contrato manual nao encontrado.');

    const isFastify = typeof res.raw !== 'undefined';
    const stream = isFastify ? res.raw : res;
    const fileName = `contrato-manual-${contract.company?.name?.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || contract.id}.pdf`;

    if (isFastify) {
      stream.setHeader('Content-Type', 'application/pdf');
      stream.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    } else {
      res.header('Content-Type', 'application/pdf');
      res.header('Content-Disposition', `attachment; filename=${fileName}`);
    }

    const pdfkit = await import('pdfkit');
    const doc = new pdfkit.default({ margin: 38, size: 'A4', bufferPages: true });
    doc.pipe(stream);

    const money = (value: number | string | null | undefined) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const date = (value?: string | Date | null) => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value)) : '-';
    const planName = contract.plan?.name || 'Plano manual';

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text('Contrato Comercial Manual', { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(`Gerado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())} • Revisado por ${actorId}`, { align: 'center' });
    doc.moveDown(1);

    doc.roundedRect(38, doc.y, 519, 86, 12).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('Partes', 54, doc.y + 12);
    doc.font('Helvetica').fontSize(9).fillColor('#334155');
    doc.text(`Empresa: ${contract.company?.name || 'Empresa'}`, 54, doc.y + 28);
    doc.text(`CNPJ: ${contract.company?.document || '-'}`, 54, doc.y + 42);
    doc.text(`Plano: ${planName}`, 310, doc.y + 28);
    doc.text(`Status: ${contract.status}`, 310, doc.y + 42);

    doc.moveDown(1.8);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('Resumo financeiro', { underline: false });
    doc.moveDown(0.5);
    const items = [
      ['Valor acordado', money(Number(contract.agreedAmount))],
      ['Licenças', String(contract.seatQuantity)],
      ['Início', date(contract.startsAt)],
      ['Fim', contract.endsAt ? date(contract.endsAt) : 'Indeterminado'],
      ['Pagamento', contract.paymentMethod],
      ['Número externo', contract.externalContractNumber || '-'],
    ];
    items.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = col === 0 ? 54 : 310;
      const y = doc.y + (row * 18);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(item[0], x, y);
      doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(item[1], x, y + 10);
    });

    doc.y += 48;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('Observações');
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9).fillColor('#334155').text(contract.notes || 'Sem observações.');
    if (contract.documentUrl) {
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text('Documento vinculado');
      doc.font('Helvetica').fillColor('#2563eb').text(contract.documentUrl, { underline: true });
    }

    doc.moveDown(1.6);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
      .text(`Contrato registrado no Innovation RH System • ID ${contract.id}`, { align: 'right' });

    doc.end();
  }
}
