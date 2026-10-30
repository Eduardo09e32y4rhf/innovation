import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CandidateConsentService } from './candidate-consent.service';
import { CandidateDocumentScanner } from './candidate-document-scanner.service';
import { JobScopeService } from './job-scope.service';
import { PublicCandidateDocumentsController } from './public-candidate-documents.controller';
import { RecruitmentDocumentsController } from './recruitment-documents.controller';
import { RecruitmentDocumentsService } from './recruitment-documents.service';
import { RecruitmentDocumentsCron } from './recruitment-documents.cron';
import { JobExpiryService } from './job-expiry.service';
import { JobExpiryCron } from './job-expiry.cron';
import { InternalJobsController } from './internal-jobs.controller';
import { InternalJobsService } from './internal-jobs.service';
import { JobsController } from './jobs.controller';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';
import { JobAuditService } from './job-audit.service';
import { CandidateComparisonController } from './candidate-comparison.controller';
import { CandidateComparisonService } from './candidate-comparison.service';
import { JobsStorageService } from './jobs-storage.service';
import { CandidateAccountController } from './candidate-account.controller';
import { CandidateAccountService } from './candidate-account.service';
import { CandidateAuthGuard } from './candidate-account.guard';
import { CandidateAdminController, TalentPoolController } from './talent-pool.controller';
import { CandidateAdminService, TalentPoolService } from './talent-pool.service';
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

import { AssessmentsService } from './assessments.service';
import { PublicInternalJobsController } from './internal-jobs.controller';
import { CandidateActionsController, PublicCandidateActionsController } from './candidate-actions.controller';
import { InterviewFollowupService } from './interview-followup.service';
import { JobOfferService } from './job-offer.service';
import { RecruiterNotifierService } from './recruiter-notifier.service';
import { RecruitmentWorkflowService } from './recruitment-workflow.service';

@Module({
  // RecruitmentController precisa vir antes: suas rotas estáticas (/jobs/pipeline, /jobs/stats...) não podem cair em /jobs/:id.
  imports: [NotificationsModule],
  controllers: [CandidateComparisonController, PublicInternalJobsController, CandidateActionsController, PublicCandidateActionsController, RecruitmentController, RecruitmentPrivacyController, PublicCandidateController, RecruitmentMetricsController, JobWorkflowController, InternalJobsController, JobsController, RecruitmentDocumentsController, PublicJobsController, PublicCandidateDocumentsController, CandidateAccountController, TalentPoolController, CandidateAdminController],
  providers: [CandidateComparisonService, JobAuditService, RecruitmentWorkflowService, RecruiterNotifierService, InterviewFollowupService, JobOfferService, AssessmentsService, TalentPoolService, CandidateAdminService, CandidateAccountService, CandidateAuthGuard, JobWorkflowService, JobTemplatesService, RecruitmentPrivacyService, RecruitmentMetricsService, InternalJobsService, JobsRepository, JobsService, JobsStorageService, RecruitmentService, JobScopeService, CandidateDocumentScanner, RecruitmentDocumentsService, CandidateConsentService, RecruitmentDocumentsCron, JobExpiryService, JobExpiryCron],
})
export class JobsModule {}

