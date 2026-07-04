const fs = require('fs');

// 1. notifications.service.ts
const notifFile = 'C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/notifications/notifications.service.ts';
let notifCode = fs.readFileSync(notifFile, 'utf8');
notifCode = notifCode.replace(
  /create: \{\s*employeeId: employee\.id,\s*date: targetDate,/g,
  "create: {\n                  companyId: employee.companyId,\n                  employeeId: employee.id,\n                  date: targetDate,"
);
fs.writeFileSync(notifFile, notifCode);

// 2. time-closing.service.ts
const closingFile = 'C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/time-track/time-closing.service.ts';
let closingCode = fs.readFileSync(closingFile, 'utf8');
closingCode = closingCode.replace(
  "import { PrismaService } from '../../common/prisma/prisma.service';",
  "import { PrismaService } from '../../database/prisma.service';"
);
closingCode = closingCode.replace(
  "const holidayMap = new Map(holidays.map(h => [h.date.toISOString().split('T')[0], h]));",
  "const holidayMap = new Map(holidays.map((h: any) => [h.date.toISOString().split('T')[0], h]));"
);
closingCode = closingCode.replace(
  "const summaries = [];",
  "const summaries: any[] = [];"
);
closingCode = closingCode.replace(
  "const period = await this.prisma.$transaction(async (tx) => {",
  "const period = await this.prisma.$transaction(async (tx: any) => {"
);
closingCode = closingCode.replace(
  "(sum, s) => sum + (s.employee?.timeTracks?.length ?? 0),",
  "(sum: number, s: any) => sum + (s.employee?.timeTracks?.length ?? 0),"
);
fs.writeFileSync(closingFile, closingCode);

// 3. time-track.service.ts
const trackFile = 'C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/time-track/time-track.service.ts';
let trackCode = fs.readFileSync(trackFile, 'utf8');
trackCode = trackCode.replace(
  "import { PrismaService } from '../../common/prisma/prisma.service';",
  "import { PrismaService } from '../../database/prisma.service';"
);
fs.writeFileSync(trackFile, trackCode);

console.log("Fixed more TS errors");
