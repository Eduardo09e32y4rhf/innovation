import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  controllers: [PartnersController],
  providers: [PartnersService, PrismaService],
  exports: [PartnersService],
})
export class PartnersModule {}
