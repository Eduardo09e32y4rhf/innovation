import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CommercialSalesController } from './commercial-sales.controller';
import { CommercialSalesService } from './commercial-sales.service';

@Module({ controllers: [CommercialSalesController], providers: [CommercialSalesService, PrismaService] })
export class CommercialSalesModule {}
