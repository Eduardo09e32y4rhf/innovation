import PDFDocument from 'pdfkit';
import { describe, expect, it, vi } from 'vitest';
import { ManagementDocumentsService } from './management-documents.service';

const company = {
  name: 'Empresa Teste',
  legalName: 'Empresa Teste Ltda.',
  document: '12345678000190',
  phone: '11999999999',
  email: 'rh@empresa.test',
  street: 'Rua Teste',
  streetNumber: '100',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
};

const employee = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Maria da Silva',
  cpf: '12345678901',
  registration: '0001',
  birthDate: new Date('1990-05-10T00:00:00.000Z'),
  position: 'Analista',
  department: 'RH',
  admissionDate: new Date('2024-01-10T00:00:00.000Z'),
};

function setup() {
  const pdfBuffers: Buffer[] = [];
  let sequence = 0;
  const prisma = {
    company: { findUnique: vi.fn() },
    employee: { findFirst: vi.fn() },
    employeeAsoRecord: { findFirst: vi.fn() },
    notification: { findFirst: vi.fn() },
    timeClosing: { findFirst: vi.fn() },
    generatedDocument: { update: vi.fn().mockResolvedValue({}) },
  };
  const documents = {
    generateDocument: vi.fn(async (_companyId, _type, _title, builder) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(Buffer.from(chunk)));
      const finished = new Promise<void>((resolve, reject) => {
        doc.once('end', resolve);
        doc.once('error', reject);
      });
      builder(doc);
      doc.end();
      await finished;
      const buffer = Buffer.concat(chunks);
      pdfBuffers.push(buffer);
      sequence += 1;
      return {
        id: `document-${sequence}`,
        storageKey: `docs/test-${sequence}.pdf`,
        sha256: 'a'.repeat(64),
      };
    }),
    getDocumentStream: vi.fn(),
  };

  return {
    prisma,
    documents,
    pdfBuffers,
    service: new ManagementDocumentsService(prisma as any, documents as any),
  };
}

describe('ManagementDocumentsService', () => {
  it('gera encaminhamento ASO no servidor e registra metadados auditáveis', async () => {
    const { service, prisma, documents, pdfBuffers } = setup();
    prisma.employee.findFirst.mockResolvedValue(employee);
    prisma.company.findUnique.mockResolvedValue(company);

    const result = await service.createAsoReferralPreview('company-1', 'actor-1', {
      employeeId: employee.id,
      asoType: 'ADMISSIONAL',
      clinicName: 'Clínica Ocupacional',
      clinicAddress: 'Rua da Clínica, 10',
      examDate: '2026-08-01T09:00:00.000Z',
    });

    expect(result.filename).toBe('encaminhamento-aso-maria-da-silva.pdf');
    expect(documents.generateDocument).toHaveBeenCalledWith(
      'company-1',
      'OTHER',
      expect.stringContaining('Maria da Silva'),
      expect.any(Function),
      'actor-1',
    );
    expect(prisma.generatedDocument.update).toHaveBeenCalledWith({
      where: { id: 'document-1' },
      data: {
        metadata: expect.objectContaining({
          module: 'MANAGEMENT',
          documentKind: 'ASO_REFERRAL',
          employeeId: employee.id,
          ruleVersion: 'NR7_2026_1',
        }),
      },
    });
    expect(pdfBuffers[0].subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdfBuffers[0].length).toBeGreaterThan(1500);
  });

  it('gera termo disciplinar a partir da notificação sem confiar em dados do frontend', async () => {
    const { service, prisma, pdfBuffers } = setup();
    prisma.notification.findFirst.mockResolvedValue({
      id: 'notification-1',
      type: 'SUSPENSION_NOTICE',
      title: 'Suspensão',
      message: 'Ausência injustificada após orientação formal.',
      extraJson: {
        legalReason: 'Descumprimento de norma interna',
        occurrenceDate: '2026-07-29T00:00:00.000Z',
        suspensionDays: 2,
      },
      company,
      recipients: [{ employee, user: { employee: null } }],
    });

    const result = await service.createLegalNoticeFromNotification('company-1', 'actor-1', 'notification-1');

    expect(prisma.notification.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'notification-1', companyId: 'company-1' }),
    }));
    expect(result.filename).toBe('suspensao-maria-da-silva.pdf');
    expect(prisma.generatedDocument.update).toHaveBeenCalledWith({
      where: { id: 'document-1' },
      data: {
        metadata: expect.objectContaining({
          documentKind: 'SUSPENSION_NOTICE',
          sourceId: 'notification-1',
          suspensionDays: 2,
        }),
      },
    });
    expect(pdfBuffers[0].subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('gera advertência avulsa validando o funcionário dentro da empresa', async () => {
    const { service, prisma, pdfBuffers } = setup();
    prisma.employee.findFirst.mockResolvedValue(employee);
    prisma.company.findUnique.mockResolvedValue(company);

    await service.createLegalNoticePreview('company-1', 'actor-1', {
      employeeId: employee.id,
      type: 'WARNING_NOTICE',
      message: 'Descumprimento do procedimento operacional.',
      occurrenceDate: '2026-07-30',
    });

    expect(prisma.employee.findFirst).toHaveBeenCalledWith({
      where: { id: employee.id, companyId: 'company-1' },
      select: expect.any(Object),
    });
    expect(pdfBuffers[0].length).toBeGreaterThan(1500);
  });

  it('gera fechamento no servidor usando versão e snapshot do cálculo', async () => {
    const { service, prisma, documents, pdfBuffers } = setup();
    prisma.timeClosing.findFirst.mockResolvedValue({
      id: 'closing-1',
      companyId: 'company-1',
      employeeId: employee.id,
      employee,
      company,
      periodStart: new Date('2026-07-01T00:00:00.000Z'),
      periodEnd: new Date('2026-07-31T00:00:00.000Z'),
      status: 'CLOSED',
      normalHours: 176,
      overtime50: 4,
      overtime100: 2,
      nightShift: 0,
      absenceMinutes: 0,
      lateMinutes: 10,
      earlyLeaveMinutes: 5,
      salaryBase: 3000,
      monthlyDivisor: 220,
      payableWorkdays: 22,
      hourlyRate: 13.64,
      overtime50Value: 81.84,
      overtime100Value: 54.56,
      nightShiftValue: 0,
      dsrValue: 18,
      absenceDiscount: 0,
      lateDiscount: 2.27,
      earlyLeaveDiscount: 1.14,
      grossPay: 3154.4,
      inssDiscount: 280,
      irrfDiscount: 45,
      fgtsAmount: 252.35,
      netPay: 2826,
      calculationVersion: 'CLT_2026_1',
      taxTableSnapshot: { inss: '2026-1' },
    });

    const result = await service.createClosingReport('company-1', 'actor-1', 'closing-1');

    expect(result.filename).toBe('fechamento-maria-da-silva-2026-07.pdf');
    expect(documents.generateDocument).toHaveBeenCalledWith(
      'company-1',
      'PAYSLIP',
      expect.any(String),
      expect.any(Function),
      'actor-1',
    );
    expect(prisma.generatedDocument.update).toHaveBeenCalledWith({
      where: { id: 'document-1' },
      data: {
        metadata: expect.objectContaining({
          documentKind: 'TIME_CLOSING',
          calculationVersion: 'CLT_2026_1',
          immutableSnapshot: true,
        }),
      },
    });
    expect(pdfBuffers[0].subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('bloqueia geração quando o registro não pertence à empresa', async () => {
    const { service, prisma, documents } = setup();
    prisma.employeeAsoRecord.findFirst.mockResolvedValue(null);

    await expect(
      service.createAsoReferralFromRecord('company-1', 'actor-1', 'aso-outro-tenant'),
    ).rejects.toThrow('ASO não encontrado.');
    expect(documents.generateDocument).not.toHaveBeenCalled();
  });
});
