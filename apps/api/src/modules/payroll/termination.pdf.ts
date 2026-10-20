import { PDF, PdfReport, fmt, type PdfCell } from '../../common/pdf/pdf-report';

export const TRCT_VERSION = 'TRCT_V1';

interface Line { code: string; label: string; amount: number; legalBasis: string }

export interface TrctPdfInput {
  identifier: string;
  issuedAt: Date;
  issuer: string;
  company: { name: string; legalName?: string | null; document?: string | null; logoUrl?: string | null; email?: string | null; phone?: string | null };
  employee: { name: string; cpf?: string | null; registration?: string | null; position?: string | null; admissionDate?: Date | string | null };
  snapshot: any;
}

export async function buildTrctPdf(input: TrctPdfInput): Promise<Buffer> {
  const { company, employee, snapshot: r } = input;
  const report = await PdfReport.create({
    title: 'Termo de Rescisão do Contrato de Trabalho',
    number: input.identifier,
    subtitle: `Desligamento em ${fmt.day(r.terminationDate)}`,
    brand: { name: company.legalName || company.name, document: company.document, logoUrl: company.logoUrl },
    footerNote: `Emitido por ${input.issuer}. O hash SHA-256 integra o registro digital imutável.`,
    footerId: `${input.identifier} · ${TRCT_VERSION}`,
    generatedAt: input.issuedAt,
  });

  report.section('Dados do colaborador');
  report.fields([
    ['Nome', employee.name], ['CPF', employee.cpf ? fmt.document(employee.cpf) : 'Não informado'],
    ['Matrícula', employee.registration || '-'], ['Cargo', employee.position || '-'],
    ['Admissão', fmt.day(employee.admissionDate)], ['Desligamento', fmt.day(r.terminationDate)],
    ['Tipo de rescisão', String(r.type).replace(/_/g, ' ')], ['Aviso prévio', r.noticeMode ? `${r.noticeMode} (${r.proportionalNoticeDays} dia(s))` : '-'],
  ], 2);

  const cols = [{ label: 'Verba', width: 275 }, { label: 'Base legal', width: 140 }, { label: 'Valor', width: 100, align: 'right' as const }];
  const toRows = (lines: Line[]): PdfCell[][] => lines.map((l) => [l.label, { text: l.legalBasis, color: PDF.color.mut }, { text: fmt.money(l.amount), bold: true }]);

  report.section('Verbas rescisórias');
  report.table(cols, toRows(r.earnings), { totals: ['Total de proventos', '', fmt.money(r.totalEarnings)] });
  if (r.discounts.length) {
    report.section('Descontos');
    report.table(cols, toRows(r.discounts), { totals: ['Total de descontos', '', fmt.money(r.totalDiscounts)] });
  }
  report.total('Valor líquido da rescisão', fmt.money(r.netAmount));

  report.section('FGTS');
  report.fields([
    ['Depósito do mês rescisório', fmt.money(r.fgts.rescissionDeposit)],
    [`Multa rescisória (${Math.round(r.fgts.fineRate * 100)}%)`, fmt.money(r.fgts.fine)],
    ['Saque autorizado', `${r.fgts.withdrawalPercent}%`],
    ['Seguro-desemprego', r.unemploymentInsuranceEligible ? 'Elegível' : 'Não aplicável'],
  ], 2);

  if (Number(r.variableMonthly) > 0) {
    report.paragraph(`Média mensal de verbas variáveis incorporada à base: ${fmt.money(r.variableMonthly)} (CLT art. 142 §§3º e 5º; art. 487 §3º).`, { size: 8.5, color: PDF.color.mut });
  }
  for (const w of r.warnings ?? []) report.paragraph(`Atenção: ${w}`, { size: 8.5, color: PDF.color.mut });
  report.paragraph(`Prazo para pagamento das verbas rescisórias: ${fmt.day(r.paymentDeadline)} (CLT art. 477 §6º).`, { size: 9 });
  report.signatures([{ label: 'Assinatura do colaborador', sub: employee.name }, { label: 'Empregador / RH' }]);
  return report.finish();
}
