import { Module } from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [HolidaysService],
  exports: [HolidaysService],
})
export class HolidaysModule {}
