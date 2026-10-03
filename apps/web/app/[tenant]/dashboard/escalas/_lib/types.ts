import type { ScheduleCapability, ScheduleScope } from '@/app/lib/schedule-access';

export type DayType = 'TRABALHO' | 'FOLGA' | 'FERIADO' | 'FERIAS' | 'ATESTADO' | 'SUSPENSAO' | 'COMPENSACAO' | 'FERIADO_LOCAL' | 'AJUSTE_ESCALA' | 'SEM_ESCALA';
export type DayStatus = 'OK' | 'FALTA' | 'ATRASO' | 'PENDENTE' | 'ANDAMENTO' | null;

export interface ResolvedDay {
  date: string;
  dayOfWeek: number;
  type: DayType;
  working: boolean;
  entry: string | null;
  lunchStart: string | null;
  lunchReturn: string | null;
  exit: string | null;
  scheduleId: string | null;
  scheduleName: string | null;
  exceptionType: string | null;
  exceptionReason: string | null;
  holidayName: string | null;
}

export interface PunchToday {
  employee: { id: string; name: string };
  workDate: string;
  serverTime: string;
  day: ResolvedDay;
  next: { type: string; label: string } | null;
  events: { id: string; type: string; label: string; occurredAt: string; withinFence: boolean | null; distanceMeters: number | null; flags: string[]; address: string | null; receipt: string }[];
  totals: { totalWorked: number | null; dailyBalance: number | null; lateMinutes: number; overtime50Minutes: number; overtime100Minutes: number } | null;
  policy: { requireLocation: boolean; fencePolicy: 'BLOCK' | 'FLAG' | 'OFF'; maxAccuracyMeters: number; requireJustificationOutside: boolean };
  fenceConfigured: boolean;
  external: boolean;
}

export interface PunchResult {
  receipt: string;
  type: string;
  label: string;
  occurredAt: string;
  flags: string[];
  pendingApproval: boolean;
  address: string | null;
  next: { type: string; label: string } | null;
}

export interface TeamPerson { id: string; name: string; department: string | null; status: string; label: string; entry: string | null; exit: string | null; firstPunch: string | null }

export interface Overview {
  role: string;
  capabilities: Partial<Record<ScheduleCapability, ScheduleScope>>;
  today: string;
  month: string;
  me?: { employee: { id: string; name: string; managerId?: string | null; department?: string | null }; day?: ResolvedDay; bankBalance?: number; pendingRequests?: number; punched?: boolean };
  team?: { counts: Record<string, number>; total: number; people: TeamPerson[] };
  pending?: { requests: number; punches: number; overtime: number; total: number };
  hr?: { withoutSchedule: { id: string; name: string }[]; withoutScheduleCount: number; activeEmployees: number; punchedToday: number; closing: Record<string, number> };
  indicators?: Indicators;
}

export interface Indicators {
  month: string;
  totals: { worked: number; overtime50: number; overtime100: number; late: number; night: number; absences: number; bankBalance: number };
  byDepartment: { department: string; worked: number; overtime: number; late: number; absences: number; employees: number }[];
}

export interface CalendarPayload {
  month: string;
  today: string;
  dates: string[];
  employees: { id: string; name: string; department: string | null; position: string | null; days: { type: DayType; entry: string | null; exit: string | null; status: DayStatus; holiday: string | null; schedule: string | null }[] }[];
}

export interface DayDetail {
  employee: { id: string; name: string; department: string | null } | null;
  date: string;
  scheduled: ResolvedDay;
  track: { entry: string | null; lunchStart: string | null; lunchReturn: string | null; exit: string | null; totalWorked: number | null; dailyBalance: number | null; manualStatus: string | null; overtimeApprovalStatus: string | null; incidentType: string | null } | null;
  events: { id: string; type: string; origin: string; occurredAt: string; withinFence: boolean | null; distanceMeters: number | null; flags: string[]; justification: string | null; receipt: string; latitude?: number | null; longitude?: number | null; accuracyMeters?: number | null; address?: string | null }[];
  occurrences: { id: string; type: string; minutes: number; status: string; reason: string | null }[];
  requests: { id: string; type: string; status: string }[];
  explain: { label: string; value: string; hint?: string }[];
}

export interface Timesheet {
  employee: { id: string; name: string; department: string | null; position: string | null } | null;
  month: string;
  closing: { id: string; status: string } | null;
  totals: { worked: number; balance: number; late: number; overtime50: number; overtime100: number; night: number; absences: number; bankBalance: number };
  days: { date: string; dayOfWeek: number; type: DayType; scheduled: { entry: string | null; exit: string | null }; entry: string | null; lunchStart: string | null; lunchReturn: string | null; exit: string | null; worked: number | null; balance: number | null; late: number; overtime50: number; overtime100: number; night: number; status: DayStatus; holiday: string | null }[];
}

export type RequestType = 'TROCA_FOLGA' | 'TROCA_TURNO' | 'NOVA_ESCALA' | 'AJUSTE_BATIDA' | 'JUSTIFICATIVA' | 'FOLGA_COMPENSACAO';
export type RequestStatus = 'AWAITING_PEER' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ScheduleRequestItem {
  id: string;
  type: RequestType;
  typeLabel: string;
  status: RequestStatus;
  payload: Record<string, any>;
  reason: string | null;
  currentStep: 'MANAGER' | 'HR' | null;
  steps: { step: 'MANAGER' | 'HR'; status: 'PENDING' | 'APPROVED' | 'REJECTED'; byName?: string; at?: string; note?: string }[];
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  requester: { id: string; name: string; department: string | null } | null;
  peer: { id: string; name: string } | null;
  mine: boolean;
  canCancel: boolean;
  canRespondPeer: boolean;
  canDecide: boolean;
}

export interface Finding { level: 'error' | 'warning'; code: string; message: string }

export interface Approvals {
  requests: ScheduleRequestItem[];
  punches: { id: string; date: string; employee: { id: string; name: string; department: string | null } | null; reason: string | null; observation: string | null; entry: string | null; exit: string | null }[];
  overtime: { id: string; date: string; employee: { id: string; name: string; department: string | null } | null; overtime50: number; overtime100: number; exceedsLimit: boolean }[];
}

export interface PunchPolicy {
  requireLocation: boolean;
  fencePolicy: 'BLOCK' | 'FLAG' | 'OFF';
  maxAccuracyMeters: number;
  minIntervalSeconds: number;
  maxPunchesPerDay: number;
  earlyWindowMinutes: number;
  lateWindowMinutes: number;
  adjustmentDeadlineDays: number;
  requireJustificationOutside: boolean;
  maxSpeedKmh: number;
  configured?: boolean;
}

export interface Geofence { id: string; name: string; latitude: number; longitude: number; radiusMeters: number; active: boolean }

export interface ScheduleTemplate {
  id: string;
  name: string;
  description?: string | null;
  scaleType: string;
  status: string;
  entryTime?: string | null;
  lunchStartTime?: string | null;
  lunchReturnTime?: string | null;
  exitTime?: string | null;
  workDays: number[];
  restDays: number[];
  cycleWorkHours?: number | null;
  cycleRestHours?: number | null;
  cycleStartDate?: string | null;
  isNightShift?: boolean;
}

export interface Person { id: string; name: string; department?: string | null; position?: string | null }
