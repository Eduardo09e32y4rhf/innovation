import { Module } from '@nestjs/common';
import { LookupController } from './lookup.controller';

@Module({ controllers: [LookupController] })
export class LookupModule {}
