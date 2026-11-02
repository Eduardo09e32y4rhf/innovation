import { Module } from '@nestjs/common';
import { FreelancerEngagementController } from './freelancer-engagement.controller';
import { FreelancerEngagementService } from './freelancer-engagement.service';
import { RecruitmentInvoiceController } from './recruitment-invoice.controller';
import { RecruitmentInvoiceService } from './recruitment-invoice.service';

@Module({
  controllers: [FreelancerEngagementController, RecruitmentInvoiceController],
  providers: [FreelancerEngagementService, RecruitmentInvoiceService],
})
export class FreelancerRecruitmentModule {}
