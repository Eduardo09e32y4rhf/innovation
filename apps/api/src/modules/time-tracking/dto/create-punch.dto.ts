export class CreatePunchDto {
  type: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';
  timestamp: string;
  note?: string;
  employeeId: string;
}
