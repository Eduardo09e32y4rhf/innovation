const fs = require('fs');
const file = 'C:/Users/eduar/Desktop/innovation.ia/apps/api/src/modules/time-track/time-track.service.ts';
let code = fs.readFileSync(file, 'utf8');

// Imports
code = code.replace(
  "import { WorkScheduleRulesService } from './work-schedule-rules.service';",
  "import { WorkScheduleRulesService } from './work-schedule-rules.service';\nimport { TimeCalculationRulesService } from './time-calculation-rules';\nimport { PrismaService } from '../../common/prisma/prisma.service';"
);

// Constructor
code = code.replace(
  "    private readonly rulesService: WorkScheduleRulesService,\n  ) {}",
  "    private readonly rulesService: WorkScheduleRulesService,\n    private readonly timeCalcRules: TimeCalculationRulesService,\n    private readonly prisma: PrismaService,\n  ) {}"
);

fs.writeFileSync(file, code);
console.log("Patched imports and constructor");
