import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';
import { JobsStorageService } from './jobs-storage.service';
import { PublicJobsController } from './public-jobs.controller';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';

@Module({
  // RecruitmentController precisa vir antes: suas rotas estáticas (/jobs/pipeline, /jobs/stats...) não podem cair em /jobs/:id.
  controllers: [RecruitmentController, JobsController, PublicJobsController],
  providers: [JobsRepository, JobsService, JobsStorageService, RecruitmentService],
})
export class JobsModule {}
