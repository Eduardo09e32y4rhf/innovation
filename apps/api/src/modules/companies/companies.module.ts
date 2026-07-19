import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesRepository } from './companies.repository';
import { CompaniesService } from './companies.service';
import { GeocodingService } from './geocoding.service';

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesRepository, GeocodingService],
})
export class CompaniesModule {}
