import { BadRequestException, Controller, Get, Optional, Param, Post, Req, Res, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TurnstileGuard } from '../../common/turnstile/turnstile.guard';
import { RedisService } from '../../common/redis/redis.service';
import { clientIp } from '../../common/http/client-ip';
import { ApplyLimiter, assertApplyAllowed } from './apply-abuse';
import { JobsService } from './jobs.service';

@Controller('public/jobs')
export class PublicJobsController {
  private readonly limiter: ApplyLimiter;

  constructor(private readonly service: JobsService, @Optional() redis?: RedisService) {
    this.limiter = new ApplyLimiter(redis);
  }

  @Get()
  listAll() {
    return this.service.publicJobsCatalog();
  }

  @Get('company/:companyKey')
  list(@Param('companyKey') companyKey: string) {
    return this.service.publicJobs(companyKey);
  }

  /** Feed XML (formato Indeed/Jooble) das vagas abertas da empresa. Publico: portais de vagas leem sem login. */
  @Get('company/:companyKey/feed.xml')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async feedXml(@Param('companyKey') companyKey: string, @Res() reply: any) {
    const body = await this.service.publicFeed(companyKey, 'xml');
    reply.header('Content-Type', 'application/xml; charset=utf-8').header('Cache-Control', 'public, max-age=900');
    return reply.send(body);
  }

  @Get('company/:companyKey/feed.json')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async feedJson(@Param('companyKey') companyKey: string, @Res() reply: any) {
    const body = await this.service.publicFeed(companyKey, 'json');
    reply.header('Cache-Control', 'public, max-age=900');
    return reply.send(body);
  }

  @Get(':jobId')
  get(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.service.publicJobById(jobId);
  }

  @Post(':jobId/apply')
  @UseGuards(TurnstileGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async apply(@Param('jobId', ParseUUIDPipe) jobId: string, @Req() request: any) {
    const ip = String(request.ip ?? 'unknown');
    const context = { ip: clientIp(request), userAgent: typeof request.headers?.['user-agent'] === 'string' ? request.headers['user-agent'] : undefined };
    if (!request.isMultipart?.()) {
      await assertApplyAllowed(this.limiter, ip, jobId, request.body?.email);
      return this.service.apply(jobId, request.body || {}, undefined, context);
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
    await assertApplyAllowed(this.limiter, ip, jobId, fields.email);
    return this.service.apply(jobId, fields, file, context);
  }
}
