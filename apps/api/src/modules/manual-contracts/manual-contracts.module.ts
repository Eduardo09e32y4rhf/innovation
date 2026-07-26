import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { ManualContractsController } from './manual-contracts.controller';
import { ManualContractsRepository } from './manual-contracts.repository';
import { ManualContractsService } from './manual-contracts.service';

@Module({
  imports: [FinanceModule],
  controllers: [ManualContractsController],
  providers: [ManualContractsService, ManualContractsRepository],
})
export class ManualContractsModule {}
