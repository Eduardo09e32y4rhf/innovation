import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PayrollController } from './payroll.controller';
import { PayrollRepository } from './payroll.repository';
import { PayrollService } from './payroll.service';

@Module({
  controllers: [PayrollController],
  providers: [PayrollService, PayrollRepository, PrismaService],
  exports: [PayrollService],
})
export class PayrollModule {}
