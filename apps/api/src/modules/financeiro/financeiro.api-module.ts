import { Module } from '@nestjs/common';
import { FinanceiroController } from './financeiro.controller';

@Module({
  controllers: [FinanceiroController],
})
export class FinanceiroApiModule {}
