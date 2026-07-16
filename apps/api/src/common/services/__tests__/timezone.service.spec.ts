import { TimeZoneService } from '../timezone.service';

describe('TimeZoneService', () => {
  let service: TimeZoneService;

  beforeEach(() => {
    service = new TimeZoneService();
  });

  it('Test 1: parseFromBRT("2024-02-15") returns UTC Date representing midnight BRT', () => {
    const result = service.parseFromBRT('2024-02-15');
    expect(result.toISOString()).toBe('2024-02-15T03:00:00.000Z');
  });

  it('Test 2: formatToBRT(date, "dd/MM/yyyy") returns formatted string in BRT', () => {
    const date = new Date('2024-02-15T03:00:00.000Z'); // midnight BRT
    const result = service.formatToBRT(date, 'dd/MM/yyyy');
    expect(result).toBe('15/02/2024');
  });

  it('Test 3: startOfMonthBRT("2024-02") returns 1st Feb 00:00 BRT in UTC', () => {
    const result = service.startOfMonthBRT('2024-02');
    expect(result.toISOString()).toBe('2024-02-01T03:00:00.000Z');
  });

  it('Test 4: Virada de mês correctly transitions to end of month BRT', () => {
    const result = service.endOfMonthBRT('2024-02');
    // In leap year 2024, February has 29 days. 
    // 29/02 23:59:59.999 BRT is 2024-03-01T02:59:59.999Z
    expect(result.toISOString()).toContain('2024-03-01T02:59:59.999Z');
  });
});
