import { Module } from '@nestjs/common';
import { IaController } from './ia.controller';

@Module({
  controllers: [IaController],
})
export class IaApiModule {}
