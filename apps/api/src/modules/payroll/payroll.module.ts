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

@Module({
  imports: [SupportModule],
  controllers: [TerminationController, PayrollController, DeductionRulesController],
  providers: [TerminationService, PayrollService, PayrollRepository, PrismaService, PayrollCalculationService],
  exports: [PayrollService],
})
export class PayrollModule {}
