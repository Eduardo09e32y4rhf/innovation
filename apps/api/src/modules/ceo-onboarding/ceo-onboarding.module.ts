import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { PrismaService } from '../../database/prisma.service';
import { CeoOnboardingController } from './ceo-onboarding.controller';
import { CeoOnboardingService } from './ceo-onboarding.service';

@Module({ imports: [DocumentsModule], controllers: [CeoOnboardingController], providers: [CeoOnboardingService, PrismaService] })
export class CeoOnboardingModule {}
