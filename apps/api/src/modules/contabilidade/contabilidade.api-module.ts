import { Module } from '@nestjs/common';
import { ContabilidadeController } from './contabilidade.controller';

@Module({
  controllers: [ContabilidadeController],
})
export class ContabilidadeApiModule {}
