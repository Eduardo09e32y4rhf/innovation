import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersActivityService } from './users-activity.service';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, UsersActivityService],
})
export class UsersModule {}
