import { Module } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';
import { DatabaseModule } from '../../database/prisma.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [DatabaseModule, FinanceModule],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
