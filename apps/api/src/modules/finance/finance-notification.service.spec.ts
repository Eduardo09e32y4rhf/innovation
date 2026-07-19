import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { FinanceNotificationService } from './finance-notification.service';
import { PrismaService } from '../../database/prisma.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  companyFinanceConfig: {
    findUnique: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  financeNotificationLog: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

const mockWhatsappQueue = {
  add: jest.fn(),
};

function buildInput(overrides = {}) {
  return {
    companyId: 'company-123',
    paymentId: 'pay-456',
    type: 'PAYMENT_CONFIRMED' as const,
    amount: 150,
    dueDate: new Date('2025-08-10'),
    paidAt: new Date(),
    billingType: 'PIX',
    ...overrides,
  };
}

function defaultConfig(overrides = {}) {
  return {
    notificationsEnabled: true,
    internalNotificationsEnabled: true,
    emailNotificationsEnabled: true,
    whatsappNotificationsEnabled: false,
    notifyChargeCreated: true,
    notifyPaymentConfirmed: true,
    notifyPaymentOverdue: true,
    notifyPaymentCanceled: true,
    notifyInvoiceAuthorized: true,
    financialWhatsappPhone: null,
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let service: FinanceNotificationService;

beforeEach(async () => {
  jest.clearAllMocks();
  process.env.FINANCE_WHATSAPP_NOTIFICATIONS_ENABLED = 'false';

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      FinanceNotificationService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: getQueueToken('whatsapp-send'), useValue: mockWhatsappQueue },
    ],
  }).compile();

  service = module.get<FinanceNotificationService>(FinanceNotificationService);
});

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('FinanceNotificationService', () => {
  // 1. Cobrança criada gera notificação interna
  it('CHARGE_CREATED cria notificação interna', async () => {
    const input = buildInput({ type: 'CHARGE_CREATED' });
    mockPrisma.companyFinanceConfig.findUnique.mockResolvedValue(defaultConfig());
    mockPrisma.financeNotificationLog.findUnique.mockResolvedValue(null);
    mockPrisma.company.findUnique.mockResolvedValue({ id: 'company-123', name: 'Empresa Teste' });
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
    mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });
    mockPrisma.financeNotificationLog.upsert.mockResolvedValue({});

    await service.notify(input);

    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
  });

  // 2. Evento duplicado não envia mensagem duplicada
  it('Evento duplicado não reenvia — idempotência', async () => {
    const input = buildInput({ type: 'PAYMENT_CONFIRMED' });
    mockPrisma.companyFinanceConfig.findUnique.mockResolvedValue(defaultConfig());
    mockPrisma.financeNotificationLog.findUnique.mockResolvedValue({ status: 'SENT' }); // já enviado
    mockPrisma.company.findUnique.mockResolvedValue({ id: 'company-123', name: 'Empresa' });

    await service.notify(input);

    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  // 3. PAYMENT_CONFIRMED gera notificação do tipo correto
  it('PAYMENT_CONFIRMED gera notificação interna', async () => {
    const input = buildInput({ type: 'PAYMENT_CONFIRMED' });
    mockPrisma.companyFinanceConfig.findUnique.mockResolvedValue(defaultConfig());
    mockPrisma.financeNotificationLog.findUnique.mockResolvedValue(null);
    mockPrisma.company.findUnique.mockResolvedValue({ id: 'company-123', name: 'Empresa' });
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
    mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });
    mockPrisma.financeNotificationLog.upsert.mockResolvedValue({});

    await service.notify(input);

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Pagamento confirmado',
        }),
      }),
    );
  });

  // 4. PAYMENT_OVERDUE gera notificação com prioridade HIGH
  it('PAYMENT_OVERDUE gera notificação com priority HIGH', async () => {
    const input = buildInput({ type: 'PAYMENT_OVERDUE' });
    mockPrisma.companyFinanceConfig.findUnique.mockResolvedValue(defaultConfig());
    mockPrisma.financeNotificationLog.findUnique.mockResolvedValue(null);
    mockPrisma.company.findUnique.mockResolvedValue({ id: 'company-123', name: 'Empresa' });
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
    mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });
    mockPrisma.financeNotificationLog.upsert.mockResolvedValue({});

    await service.notify(input);

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ priority: 'HIGH' }),
      }),
    );
  });

  // 5. Falha no WhatsApp não quebra o webhook
  it('Falha no WhatsApp não lança exceção para o chamador', async () => {
    process.env.FINANCE_WHATSAPP_NOTIFICATIONS_ENABLED = 'true';
    const input = buildInput({ type: 'PAYMENT_CONFIRMED' });
    mockPrisma.companyFinanceConfig.findUnique.mockResolvedValue(
      defaultConfig({ whatsappNotificationsEnabled: true, financialWhatsappPhone: '11999999999' }),
    );
    mockPrisma.financeNotificationLog.findUnique.mockResolvedValue(null);
    mockPrisma.company.findUnique.mockResolvedValue({ id: 'company-123', name: 'Empresa', phone: '11999999999' });
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
    mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });
    mockPrisma.financeNotificationLog.upsert.mockResolvedValue({});
    mockWhatsappQueue.add.mockRejectedValue(new Error('WhatsApp offline'));

    // Não deve lançar
    await expect(service.notify(input)).resolves.not.toThrow();
  });

  // 6. WhatsApp desabilitado gera SKIPPED
  it('WhatsApp desabilitado por empresa gera SKIPPED', async () => {
    process.env.FINANCE_WHATSAPP_NOTIFICATIONS_ENABLED = 'true';
    const input = buildInput({ type: 'CHARGE_CREATED' });
    mockPrisma.companyFinanceConfig.findUnique.mockResolvedValue(
      defaultConfig({ whatsappNotificationsEnabled: false }),
    );
    mockPrisma.financeNotificationLog.findUnique.mockResolvedValue(null);
    mockPrisma.company.findUnique.mockResolvedValue({ id: 'company-123', name: 'Empresa' });
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });
    mockPrisma.financeNotificationLog.upsert.mockResolvedValue({});

    await service.notify(input);

    expect(mockWhatsappQueue.add).not.toHaveBeenCalled();
  });

  // 7. Telefone vazio gera SKIPPED no WhatsApp
  it('Telefone não configurado gera SKIPPED no WhatsApp', async () => {
    process.env.FINANCE_WHATSAPP_NOTIFICATIONS_ENABLED = 'true';
    const input = buildInput({ type: 'CHARGE_CREATED' });
    mockPrisma.companyFinanceConfig.findUnique.mockResolvedValue(
      defaultConfig({ whatsappNotificationsEnabled: true, financialWhatsappPhone: null }),
    );
    mockPrisma.financeNotificationLog.findUnique.mockResolvedValue(null);
    mockPrisma.company.findUnique.mockResolvedValue({ id: 'company-123', name: 'Empresa', phone: null });
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.financeNotificationLog.upsert.mockResolvedValue({});

    await service.notify(input);

    expect(mockWhatsappQueue.add).not.toHaveBeenCalled();
  });

  // 8. Nota autorizada dispara notificação INVOICE_AUTHORIZED
  it('INVOICE_AUTHORIZED gera notificação interna', async () => {
    const input = buildInput({ type: 'INVOICE_AUTHORIZED', invoiceNumber: 'NF-001' });
    mockPrisma.companyFinanceConfig.findUnique.mockResolvedValue(defaultConfig());
    mockPrisma.financeNotificationLog.findUnique.mockResolvedValue(null);
    mockPrisma.company.findUnique.mockResolvedValue({ id: 'company-123', name: 'Empresa' });
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
    mockPrisma.notification.create.mockResolvedValue({ id: 'n1' });
    mockPrisma.financeNotificationLog.upsert.mockResolvedValue({});

    await service.notify(input);

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Nota fiscal emitida' }),
      }),
    );
  });

  // 9. notificationsEnabled=false faz SKIPPED de tudo
  it('notificationsEnabled=false ignora todos os canais', async () => {
    const input = buildInput({ type: 'PAYMENT_CONFIRMED' });
    mockPrisma.companyFinanceConfig.findUnique.mockResolvedValue(
      defaultConfig({ notificationsEnabled: false }),
    );
    mockPrisma.financeNotificationLog.findUnique.mockResolvedValue(null);
    mockPrisma.financeNotificationLog.upsert.mockResolvedValue({});

    await service.notify(input);

    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    expect(mockWhatsappQueue.add).not.toHaveBeenCalled();
  });
});
