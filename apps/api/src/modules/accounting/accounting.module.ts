import { Module } from '@nestjs/common';
import { TimeTrackModule } from '../time-track/time-track.module';
import { PayrollModule } from '../payroll/payroll.module';
import { AccountingController } from './accounting.controller';
import { AccountingHubService } from './accounting-hub.service';
import { AccountingOfficeService } from './accounting-office.service';
import { AccountingRulesService } from './accounting-rules.service';
import { AccountingAccessService } from '../../common/accounting-access';
import { AccountingTimeSheetService } from './accounting-time-sheet.service';
import { AccountingPayrollController } from './accounting-payroll.controller';
import { AccountingPayrollDataService } from './accounting-payroll-data.service';
import { AccountingPayrollExportService } from './accounting-payroll-export.service';
import { AccountingPayrollItemsService } from './accounting-payroll-items.service';
import { PlatformLedgerService } from './platform-ledger.service';

@Module({
  imports: [TimeTrackModule, PayrollModule],
  controllers: [AccountingController, AccountingPayrollController],
  providers: [AccountingHubService, AccountingRulesService, AccountingOfficeService, PlatformLedgerService, AccountingTimeSheetService, AccountingAccessService, AccountingPayrollDataService, AccountingPayrollItemsService, AccountingPayrollExportService],
  exports: [AccountingRulesService],
})
export class AccountingModule {}

