import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { BackupService } from './backup.service';

@Global()
@Module({
  providers: [PrismaService, BackupService],
  exports: [PrismaService, BackupService],
})
export class DatabaseModule {}
