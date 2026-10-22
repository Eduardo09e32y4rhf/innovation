import { Module } from '@nestjs/common';
import { SupportModule } from '../support/support.module';
import { VacationsController } from './vacations.controller';
import { VacationsRepository } from './vacations.repository';
import { VacationReceiptService } from './vacation-receipt.service';
import { VacationsService } from './vacations.service';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';

@Module({
  imports: [SupportModule],
  controllers: [VacationsController],
  providers: [VacationsService, VacationsRepository, VacationReceiptService, PayrollCalculationService],
})
export class VacationsModule {}
