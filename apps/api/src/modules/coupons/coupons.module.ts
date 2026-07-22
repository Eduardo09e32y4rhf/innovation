import { Module } from '@nestjs/common';
import { CouponsController } from './coupons.controller';
import { CouponsRepository } from './coupons.repository';
import { CouponsService } from './coupons.service';

@Module({
  controllers: [CouponsController],
  providers: [CouponsService, CouponsRepository],
})
export class CouponsModule {}
