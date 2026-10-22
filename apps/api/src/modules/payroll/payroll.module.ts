import { Module } from '@nestjs/common';
import { SupportModule } from '../support/support.module';
import { PrismaService } from '../../database/prisma.service';
import { DeductionRulesController } from './deduction-rules.controller';
import { PayrollController } from './payroll.controller';
import { PayrollRepository } from './payroll.repository';
import { PayrollService } from './payroll.service';
import { TerminationController } from './termination.controller';
import { TerminationService } from './termination.service';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';
import { TimeTrackModule } from '../time-track/time-track.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccountingPeriodService } from './accounting-period.service';
import { PayrollPeriodsController } from './payroll-periods.controller';

@Module({
  imports: [SupportModule, TimeTrackModule, NotificationsModule],
  controllers: [TerminationController, PayrollPeriodsController, PayrollController, DeductionRulesController],
  providers: [TerminationService, PayrollService, PayrollRepository, PrismaService, PayrollCalculationService, AccountingPeriodService],
  exports: [PayrollService, AccountingPeriodService],
})
export class PayrollModule {}
