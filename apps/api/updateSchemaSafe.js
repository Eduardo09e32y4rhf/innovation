const fs = require('fs');

const schemaPath = 'prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

const newModels = {
  WorkScheduleRule: `
model WorkScheduleRule {
  id                      String @id @default(uuid()) @db.Uuid
  companyId               String @db.Uuid
  
  // Identificação
  name                    String
  description             String?
  
  // Horários padrão
  standardEntry           String? // "08:00"
  standardExit            String? // "18:00"
  breakMinutes            Int @default(60)
  dailyMinutes            Int @default(480) // 8h padrão
  weeklyMinutes           Int @default(2400) // 40h padrão
  
  // Tolerâncias (NOVO)
  lateToleranceMinutes    Int @default(10)
  earlyLeaveToleranceMinutes Int @default(10)
  overtimeToleranceMinutes Int @default(5)
  
  // Limites (NOVO)
  maxDailyOvertimeMinutes   Int @default(120) // CLT: 2h
  maxMonthlyOvertimeMinutes Int @default(2400) // 40h
  
  // Escala customizável (NOVO)
  workScale               String @default("5x2") // "5x2", "6x1", "12x36", etc
  restDaysOfWeek          Int[] @default([0, 6]) // 0=domingo, 6=sábado
  
  // Turno noturno (NOVO)
  nightShiftEnabled       Boolean @default(false)
  nightStartTime          String @default("22:00")
  nightEndTime            String @default("05:00")
  nightShiftPercent       Int @default(20) // % de adicional
  
  // Hora extra
  normalOvertimePercent   Int @default(50) // 50%
  holidayOvertimePercent  Int @default(100) // 100%
  
  // Fechamento
  closingStartDay         Int @default(1)
  closingEndDay           Int @default(31)
  adjustmentDeadlineDay   Int @default(5)
  managerApprovalDeadlineDay Int @default(10)
  
  status                  String @default("ACTIVE")
  
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  
  company                 Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  employees               Employee[]
  
  @@index([companyId])
  @@index([status])
}
`,
  Holiday: `
model Holiday {
  id                      String @id @default(uuid()) @db.Uuid
  companyId               String @db.Uuid
  
  date                    DateTime @db.Date
  name                    String // "Natal", "Independência", etc
  
  // NOVO: Empresa decide como tratar
  handling                String @default("PAID_100") // FOLGA ou PAID_100
  affectsWeekend          Boolean @default(false)
  scope                   String @default("NATIONAL") // NATIONAL, STATE, MUNICIPAL, CUSTOM
  
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  deletedAt               DateTime?
  
  company                 Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, date]) // Uma empresa, uma data, um feriado
  @@index([companyId])
  @@index([date])
}
`,
  TimeTrack: `
model TimeTrack {
  id                      String @id @default(uuid()) @db.Uuid
  companyId               String @db.Uuid
  employeeId              String @db.Uuid
  date                    DateTime @db.Date
  
  // Registros
  entry                   DateTime?
  lunchStart              DateTime?
  lunchReturn             DateTime?
  exit                    DateTime?
  
  // Cálculos
  totalWorked             Int? // minutos
  dailyBalance            Int? // minutos (pode ser negativo)
  overtime50Minutes       Int @default(0)
  overtime100Minutes      Int @default(0)
  nightShiftMinutes       Int @default(0)
  incidentType            String? // "atraso", "saida_antecipada"
  lateMinutes             Int @default(0)
  toleranceMinutes        Int?
  absenceMinutes          Int?
  
  // Aprovação (NOVO)
  overtimeApprovalStatus  String @default("PENDING") // PENDING, APPROVED, REJECTED
  overtimeExceedsLimit    Boolean @default(false)
  overtimeApprovedAt      DateTime?
  overtimeApprovedByUserId String? @db.Uuid
  
  // Handling: RH decide banco vs pagamento (NOVO)
  overtimeHandling        String @default("PAYMENT") // BANK, PAYMENT, SPLIT
  overtimeBankMinutes     Int @default(0) // Quanto vai pro banco
  overtimePaymentMinutes  Int @default(0) // Quanto entra em folha
  
  // Ajuste manual
  manualReason            String?
  manualStatus            String? @default("approved") // "pending", "approved", "rejected"
  observation             String?
  latitude                Float?
  longitude               Float?
  
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  
  employee                Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  company                 Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  approvedByUser          User? @relation("OvertimeApprovals", fields: [overtimeApprovedByUserId], references: [id], onDelete: SetNull)
  
  @@unique([employeeId, date])
  @@index([employeeId])
  @@index([companyId])
  @@index([overtimeApprovalStatus])
  @@index([date])
}
`,
  TimeClosingSummary: `
model TimeClosingSummary {
  id                      String @id @default(uuid()) @db.Uuid
  timeClosingPeriodId     String @db.Uuid
  employeeId              String @db.Uuid
  
  // Horas
  normalMinutes           Int @default(0)
  overtime50Minutes       Int @default(0)
  overtime100Minutes      Int @default(0)
  
  // Handling: como foi distribuído (NOVO)
  overtimeBankMinutes     Int @default(0)
  overtimePaymentMinutes  Int @default(0)
  
  // Ocorrências
  lateMinutes             Int @default(0)
  absenceDays             Decimal @default(0) @db.Decimal(5, 2)
  holidayDays             Int @default(0) // Feriados FOLGA
  paidHolidayDays         Int @default(0) // Feriados PAID_100
  vacationDays            Int @default(0)
  daysWorked              Int @default(0)
  attendancePercent       Decimal @default(100) @db.Decimal(5, 2)
  
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  
  period                  TimeClosingPeriod @relation(fields: [timeClosingPeriodId], references: [id], onDelete: Cascade)
  employee                Employee @relation("ClosingSummaries", fields: [employeeId], references: [id], onDelete: Cascade)
  
  @@unique([timeClosingPeriodId, employeeId])
  @@index([employeeId])
  @@index([timeClosingPeriodId])
}
`,
  OvertimeBank: `
model OvertimeBank {
  id                      String @id @default(uuid()) @db.Uuid
  companyId               String @db.Uuid
  employeeId              String @unique @db.Uuid
  
  balanceMinutes          Int @default(0) // Saldo atual (pode ser negativo)
  accumulatedMinutes      Int @default(0) // Total histórico
  
  lastUpdatedAt           DateTime @default(now())
  
  employee                Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  company                 Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, employeeId])
  @@index([employeeId])
}
`,
  TimeClosingAuditLog: `
model TimeClosingAuditLog {
  id                      String @id @default(uuid()) @db.Uuid
  timeClosingPeriodId     String @db.Uuid
  userId                  String @db.Uuid
  
  action                  String // GENERATED, CLOSED, REOPENED, APPROVED, MODIFIED
  reason                  String?
  changedData             Json?
  
  createdAt               DateTime @default(now())
  
  period                  TimeClosingPeriod @relation(fields: [timeClosingPeriodId], references: [id], onDelete: Cascade)
  user                    User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([timeClosingPeriodId])
  @@index([userId])
}
`
};

for (const [modelName, modelContent] of Object.entries(newModels)) {
  const regex = new RegExp('model ' + modelName + ' \\{[\\s\\S]*?\\n\\}', 'g');
  if (schema.match(regex)) {
    schema = schema.replace(regex, modelContent.trim());
  } else {
    schema += '\n' + modelContent.trim() + '\n';
  }
}

// Ensure relations exist in other models
if (schema.includes('model Employee {')) {
  if (!schema.includes('closingSummaries        TimeClosingSummary[] @relation("ClosingSummaries")')) {
    schema = schema.replace(/model Employee \{[\s\S]*?\n\}/, match => match.replace(/\n\}/, '\n  closingSummaries        TimeClosingSummary[] @relation("ClosingSummaries")\n  overtimeBank            OvertimeBank?\n}'));
  }
}

if (schema.includes('model TimeClosingPeriod {')) {
  if (!schema.includes('summaries               TimeClosingSummary[]')) {
    schema = schema.replace(/model TimeClosingPeriod \{[\s\S]*?\n\}/, match => match.replace(/\n\}/, '\n  summaries               TimeClosingSummary[]\n  auditLogs               TimeClosingAuditLog[]\n}'));
  }
}

if (schema.includes('model Company {')) {
  if (!schema.includes('overtimeBanks           OvertimeBank[]')) {
    schema = schema.replace(/model Company \{[\s\S]*?\n\}/, match => match.replace(/\n\}/, '\n  overtimeBanks           OvertimeBank[]\n}'));
  }
}

if (schema.includes('model User {')) {
  if (!schema.includes('overtimeApprovals       TimeTrack[] @relation("OvertimeApprovals")')) {
    schema = schema.replace(/model User \{[\s\S]*?\n\}/, match => match.replace(/\n\}/, '\n  overtimeApprovals       TimeTrack[] @relation("OvertimeApprovals")\n  closingAuditLogs        TimeClosingAuditLog[]\n}'));
  }
}

fs.writeFileSync(schemaPath, schema);
console.log("Updated schema successfully!");
