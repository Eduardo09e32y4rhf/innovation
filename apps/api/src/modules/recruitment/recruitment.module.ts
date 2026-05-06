import { Module } from '@nestjs/common';
import { CommunicationModule } from '../communication/communication.module';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentPublicController } from './recruitment-public.controller';
import { RecruitmentRepository } from './recruitment.repository';
import { RecruitmentService } from './recruitment.service';

@Module({
  imports: [CommunicationModule],
  controllers: [RecruitmentController, RecruitmentPublicController],
  providers: [RecruitmentService, RecruitmentRepository],
})
export class RecruitmentModule {}
