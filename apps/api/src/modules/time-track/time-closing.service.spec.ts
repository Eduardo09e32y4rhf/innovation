import { Test, TestingModule } from '@nestjs/testing';
import { TimeClosingService } from './time-closing.service';
import { PrismaService } from '../../database/prisma.service';
import { HolidaysService } from '../holidays/holidays.service';
import { $Enums } from '@prisma/client';
type TimeClosingStatus = $Enums.TimeClosingStatus;

describe('TimeClosingService', () => {
  let service: TimeClosingService;
  let prismaMock: any;
  let holidaysMock: any;

  beforeEach(async () => {
    prismaMock = {
      overtimeRule: { findUnique: jest.fn(), create: jest.fn() },
      timeClosing: { deleteMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      employee: { findUnique: jest.fn() },
      timeTrack: { findMany: jest.fn() },
      timeOccurrence: { findFirst: jest.fn() },
    };

    holidaysMock = {
      isWorkday: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeClosingService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: HolidaysService, useValue: holidaysMock },
      ],
    }).compile();

    service = module.get<TimeClosingService>(TimeClosingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should generate a draft closing with correct overtime and DSR', async () => {
      const companyId = 'company-1';
      const employeeId = 'emp-1';
      const periodStart = '2026-07-01';
      const periodEnd = '2026-07-31';

      prismaMock.overtimeRule.findUnique.mockResolvedValue({
        dsrEnabled: true,
        weekdayRate: 1.5, // 50%
        sundayHolidayRate: 2.0, // 100%
        nightShiftRate: 1.2,
      });

      prismaMock.employee.findUnique.mockResolvedValue({
        id: employeeId,
        salary: 2200, // 10 per hour
        workScheduleRuleId: 'rule-1'
      });

      prismaMock.timeTrack.findMany.mockResolvedValue([
        {
          date: new Date('2026-07-02T00:00:00.000Z'), // Workday
          totalWorked: 540, // 9 hours -> 8 normal, 1 extra
          lateMinutes: 0
        },
        {
          date: new Date('2026-07-05T00:00:00.000Z'), // Sunday
          totalWorked: 120, // 2 hours
          lateMinutes: 0
        }
      ]);

      // Mock holidaysService to say 2026-07-05 is NOT a workday (Sunday)
      holidaysMock.isWorkday.mockImplementation(async (date: Date) => {
        return date.getDay() !== 0 && date.getDay() !== 6;
      });

      // No absences (mock to always return a fake occurrence if not working, to simplify)
      prismaMock.timeOccurrence.findFirst.mockResolvedValue({ id: 'occ-1' });

      const dto = { employeeIds: [employeeId], periodStart, periodEnd };
      const actor = { sub: 'admin-1', companyId, role: 'ADMIN' } as any;

      const closingMock = { id: 'closing-1' };
      prismaMock.timeClosing.create.mockResolvedValue(closingMock);

      const results = await service.generate(companyId, actor, dto);

      expect(prismaMock.timeClosing.create).toHaveBeenCalled();
      const createData = prismaMock.timeClosing.create.mock.calls[0][0].data;

      expect(createData.normalHours).toBeCloseTo(8); // Only 8 hours on 07-02
      expect(createData.overtime50).toBeCloseTo(1); // 1 hour on 07-02
      expect(createData.overtime100).toBeCloseTo(2); // 2 hours on 07-05

      // DSR = (1 + 2) * 0.2 = 0.6
      expect(createData.dsrValue).toBeCloseTo(0.6);

      // Hourly rate = 10
      // 8 * 10 + 1 * 10 * 1.5 + 2 * 10 * 2.0 + 0.6 * 10 = 80 + 15 + 40 + 6 = 141
      expect(createData.totalPayable).toBeCloseTo(141);
    });
  });
});
