const fs = require('fs');
const path = require('path');

const basePath = 'apps/api/src/modules/support';
const dtoPath = path.join(basePath, 'dto');

fs.mkdirSync(dtoPath, { recursive: true });

const files = {
  'support.module.ts': `import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { PublicSupportController } from './public-support.controller';
import { PlatformSupportController } from './platform-support.controller';
import { SupportRepository } from './support.repository';
import { SupportAuthorizationService } from './support-authorization.service';
import { SupportSlaService } from './support-sla.service';
import { SupportSlaScheduler } from './support-sla.scheduler';
import { SupportAttachmentService } from './support-attachment.service';
import { LocalSupportStorageService } from './local-support-storage.service';
import { SupportStorageService } from './support-storage.service';

@Module({
  controllers: [SupportController, PublicSupportController, PlatformSupportController],
  providers: [
    SupportService,
    SupportRepository,
    SupportAuthorizationService,
    SupportSlaService,
    SupportSlaScheduler,
    SupportAttachmentService,
    LocalSupportStorageService,
    { provide: SupportStorageService, useClass: LocalSupportStorageService }
  ],
  exports: [SupportService]
})
export class SupportModule {}`,
  'support.service.ts': `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class SupportService {}`,
  'support.repository.ts': `import { Injectable } from '@nestjs/common';\nimport { PrismaService } from '@/prisma/prisma.service';\n\n@Injectable()\nexport class SupportRepository {\n  constructor(private prisma: PrismaService) {}\n}`,
  'support-authorization.service.ts': `import { Injectable, ForbiddenException } from '@nestjs/common';\n\n@Injectable()\nexport class SupportAuthorizationService {}`,
  'support-priority.service.ts': `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class SupportPriorityService {}`,
  'support-sla.service.ts': `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class SupportSlaService {}`,
  'support-sla.scheduler.ts': `import { Injectable } from '@nestjs/common';\nimport { Cron, CronExpression } from '@nestjs/schedule';\n\n@Injectable()\nexport class SupportSlaScheduler {\n  @Cron(CronExpression.EVERY_5_MINUTES)\n  async checkSla() {}\n}`,
  'support-notification.service.ts': `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class SupportNotificationService {}`,
  'support-export.service.ts': `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class SupportExportService {}`,
  'support-attachment.service.ts': `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class SupportAttachmentService {}`,
  'support-file-validation.service.ts': `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class SupportFileValidationService {}`,
  'support-storage.service.ts': `export abstract class SupportStorageService {}`,
  'local-support-storage.service.ts': `import { Injectable } from '@nestjs/common';\nimport { SupportStorageService } from './support-storage.service';\n\n@Injectable()\nexport class LocalSupportStorageService implements SupportStorageService {}`,
  'support-attachment.processor.ts': `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class SupportAttachmentProcessor {}`,
  'support.controller.ts': `import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';\n\n@Controller('support')\nexport class SupportController {}`,
  'public-support.controller.ts': `import { Controller, Post } from '@nestjs/common';\n\n@Controller('support/public')\nexport class PublicSupportController {}`,
  'platform-support.controller.ts': `import { Controller, Get, Post, Patch } from '@nestjs/common';\n\n@Controller('platform/support')\nexport class PlatformSupportController {}`,
};

const dtos = [
  'create-support-ticket.dto.ts',
  'create-public-support-ticket.dto.ts',
  'list-support-tickets-query.dto.ts',
  'add-support-message.dto.ts',
  'update-support-ticket.dto.ts',
  'assign-support-ticket.dto.ts',
  'update-support-priority.dto.ts',
  'update-support-status.dto.ts',
  'mark-support-duplicate.dto.ts',
  'export-support-tickets-query.dto.ts'
];

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(basePath, name), content);
}

for (const dto of dtos) {
  const className = dto.replace(/-/g, '').replace('.dto.ts', 'Dto').replace(/^(.)/, (c) => c.toUpperCase());
  fs.writeFileSync(path.join(dtoPath, dto), `export class ${className} {}`);
}

console.log('Backend Support Module files created.');
