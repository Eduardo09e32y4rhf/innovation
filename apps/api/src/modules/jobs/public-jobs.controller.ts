import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JobsService } from './jobs.service';

@Controller('public/jobs')
export class PublicJobsController {
  constructor(private readonly service: JobsService) {}

  @Get('company/:companyKey')
  list(@Param('companyKey') companyKey: string) {
    return this.service.publicJobs(companyKey);
  }

  @Get(':jobId')
  get(@Param('jobId') jobId: string) {
    return this.service.publicJobById(jobId);
  }

  @Post(':jobId/apply')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async apply(@Param('jobId') jobId: string, @Req() request: any) {
    const part = await request.file({ limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
    if (!part) return this.service.apply(jobId, request.body || {}, undefined);
    const buffer = await part.toBuffer();
    const fields = Object.fromEntries(
      Object.entries(part.fields || {}).map(([key, value]: [string, any]) => [key, value?.value ?? value]),
    );
    return this.service.apply(jobId, fields, {
      buffer,
      filename: part.filename,
      mimetype: part.mimetype,
    });
  }
}
