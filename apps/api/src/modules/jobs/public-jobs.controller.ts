import { BadRequestException, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JobsService } from './jobs.service';

@Controller('public/jobs')
export class PublicJobsController {
  constructor(private readonly service: JobsService) {}

  @Get()
  listAll() {
    return this.service.publicJobsCatalog();
  }

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
    if (!request.isMultipart?.()) {
      return this.service.apply(jobId, request.body || {}, undefined);
    }
    const fields: Record<string, unknown> = {};
    let file: { buffer: Buffer; filename: string; mimetype?: string } | undefined;
    try {
      for await (const part of request.parts({ limits: { fileSize: 5 * 1024 * 1024, files: 1 } })) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          if (part.file?.truncated) {
            throw new BadRequestException({ message: 'O curriculo deve ter no maximo 5 MB.', field: 'resume' });
          }
          if (buffer.length && !file) file = { buffer, filename: part.filename, mimetype: part.mimetype };
        } else {
          fields[part.fieldname] = part.value;
        }
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      if (error?.code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new BadRequestException({ message: 'O curriculo deve ter no maximo 5 MB.', field: 'resume' });
      }
      throw new BadRequestException('Nao foi possivel ler o formulario enviado. Tente novamente.');
    }
    return this.service.apply(jobId, fields, file);
  }
}
