import { Module } from '@nestjs/common';
import { VacationsController } from './vacations.controller';
import { VacationsRepository } from './vacations.repository';
import { VacationsService } from './vacations.service';

@Module({
  controllers: [VacationsController],
  providers: [VacationsService, VacationsRepository],
})
export class VacationsModule {}
