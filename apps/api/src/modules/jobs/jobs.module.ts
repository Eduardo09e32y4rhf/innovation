import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';
import { JobsStorageService } from './jobs-storage.service';
import { PublicJobsController } from './public-jobs.controller';

@Module({
  controllers: [JobsController, PublicJobsController],
  providers: [JobsRepository, JobsService, JobsStorageService],
})
export class JobsModule {}
