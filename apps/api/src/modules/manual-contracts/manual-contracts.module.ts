import { Module } from '@nestjs/common';
import { ManualContractsController } from './manual-contracts.controller';
import { ManualContractsRepository } from './manual-contracts.repository';
import { ManualContractsService } from './manual-contracts.service';

@Module({
  controllers: [ManualContractsController],
  providers: [ManualContractsService, ManualContractsRepository],
})
export class ManualContractsModule {}
