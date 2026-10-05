import { BadRequestException, Controller, Get, Header, Param, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MAX_DOCUMENT_BYTES } from './recruitment-documents.rules';
import { RecruitmentDocumentsService } from './recruitment-documents.service';

/** Publico: o unico segredo e o token do link (guardado so como hash). Respostas nunca trazem dados pessoais do candidato. */
@Controller('public/candidate-documents')
export class PublicCandidateDocumentsController {
  constructor(private readonly service: RecruitmentDocumentsService) {}

  @Header('Cache-Control', 'no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get(':token')
  view(@Param('token') token: string) {
    return this.service.publicView(token);
  }

  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':token/upload')
  async upload(@Param('token') token: string, @Req() request: any) {
    if (!request.isMultipart?.()) throw new BadRequestException('Envie o documento como arquivo.');
    let label = '';
    let file: { buffer: Buffer } | undefined;
    try {
      for await (const part of request.parts({ limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1, fields: 3 } })) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          if (part.file?.truncated) throw new BadRequestException('O arquivo deve ter no maximo 5 MB.');
          if (buffer.length && !file) file = { buffer };
        } else if (part.fieldname === 'label') {
          label = String(part.value ?? '').slice(0, 80);
        }
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      if (error?.code === 'FST_REQ_FILE_TOO_LARGE') throw new BadRequestException('O arquivo deve ter no maximo 5 MB.');
      throw new BadRequestException('Nao foi possivel ler o arquivo enviado. Tente novamente.');
    }
    return this.service.publicUpload(token, label, file);
  }
}