
import { Module } from '@nestjs/common';
import { FacialRecognitionService } from './facial-recognition.service';
import { FacialRecognitionController } from './facial-recognition.controller';

@Module({
  imports: [],
  providers: [FacialRecognitionService],
  controllers: [FacialRecognitionController],
  exports: [FacialRecognitionService],
})
export class FacialRecognitionModule {}
