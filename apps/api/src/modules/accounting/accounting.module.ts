import { Module } from '@nestjs/common';
import { TimeTrackModule } from '../time-track/time-track.module';
import { AccountingController } from './accounting.controller';
import { AccountingHubService } from './accounting-hub.service';
import { AccountingOfficeService } from './accounting-office.service';
import { AccountingRulesService } from './accounting-rules.service';

@Module({
  imports: [TimeTrackModule],
  controllers: [AccountingController],
  providers: [AccountingHubService, AccountingRulesService, AccountingOfficeService],
  exports: [AccountingRulesService],
})
export class AccountingModule {}

