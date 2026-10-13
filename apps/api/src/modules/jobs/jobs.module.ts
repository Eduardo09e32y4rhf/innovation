import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CandidateDocumentScanner } from './candidate-document-scanner.service';
import { JobScopeService } from './job-scope.service';
import { PublicCandidateDocumentsController } from './public-candidate-documents.controller';
import { RecruitmentDocumentsController } from './recruitment-documents.controller';
import { RecruitmentDocumentsService } from './recruitment-documents.service';
import { InternalJobsController } from './internal-jobs.controller';
import { InternalJobsService } from './internal-jobs.service';
import { JobsController } from './jobs.controller';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';
import { JobsStorageService } from './jobs-storage.service';
import { CandidateAccountController } from './candidate-account.controller';
import { CandidateAccountService } from './candidate-account.service';
import { CandidateAuthGuard } from './candidate-account.guard';
import { PublicJobsController } from './public-jobs.controller';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { PublicCandidateController, RecruitmentPrivacyController } from './recruitment-privacy.controller';
import { RecruitmentPrivacyService } from './recruitment-privacy.service';
import { JobTemplatesService } from './job-templates.service';
import { JobWorkflowController } from './job-workflow.controller';
import { JobWorkflowService } from './job-workflow.service';
import { RecruitmentMetricsController } from './recruitment-metrics.controller';
import { RecruitmentMetricsService } from './recruitment-metrics.service';

@Module({
  // RecruitmentController precisa vir antes: suas rotas estáticas (/jobs/pipeline, /jobs/stats...) não podem cair em /jobs/:id.
  imports: [NotificationsModule],
  controllers: [RecruitmentController, RecruitmentPrivacyController, PublicCandidateController, RecruitmentMetricsController, JobWorkflowController, InternalJobsController, JobsController, RecruitmentDocumentsController, PublicJobsController, PublicCandidateDocumentsController, CandidateAccountController],
  providers: [CandidateAccountService, CandidateAuthGuard, JobWorkflowService, JobTemplatesService, RecruitmentPrivacyService, RecruitmentMetricsService, InternalJobsService, JobsRepository, JobsService, JobsStorageService, RecruitmentService, JobScopeService, CandidateDocumentScanner, RecruitmentDocumentsService],
})
export class JobsModule {}

