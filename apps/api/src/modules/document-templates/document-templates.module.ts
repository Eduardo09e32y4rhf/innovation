import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DocumentTemplatesController } from './document-templates.controller';

@Module({ controllers: [DocumentTemplatesController], providers: [PrismaService] })
export class DocumentTemplatesModule {}
