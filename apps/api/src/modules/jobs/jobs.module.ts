import { Module } from '@nestjs/common';
import { CandidateDocumentScanner } from './candidate-document-scanner.service';
import { JobScopeService } from './job-scope.service';
import { PublicCandidateDocumentsController } from './public-candidate-documents.controller';
import { RecruitmentDocumentsController } from './recruitment-documents.controller';
import { RecruitmentDocumentsService } from './recruitment-documents.service';
import { JobsController } from './jobs.controller';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';
import { JobsStorageService } from './jobs-storage.service';
import { PublicJobsController } from './public-jobs.controller';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';

@Module({
  // RecruitmentController precisa vir antes: suas rotas estáticas (/jobs/pipeline, /jobs/stats...) não podem cair em /jobs/:id.
  controllers: [RecruitmentController, JobsController, RecruitmentDocumentsController, PublicJobsController, PublicCandidateDocumentsController],
  providers: [JobsRepository, JobsService, JobsStorageService, RecruitmentService, JobScopeService, CandidateDocumentScanner, RecruitmentDocumentsService],
})
export class JobsModule {}
