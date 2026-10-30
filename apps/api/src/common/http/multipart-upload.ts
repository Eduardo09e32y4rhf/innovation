import { BadRequestException, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';

/** Arquivo recebido por multipart, no formato que os servicos ja esperavam do antigo multer. */
export interface UploadedBlob {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface MultipartUpload {
  file?: UploadedBlob;
  fields: Record<string, string>;
}

interface MultipartRequest {
  isMultipart?: () => boolean;
  parts?: (options?: unknown) => AsyncIterableIterator<any>;
}

/**
 * Le um multipart/form-data sob FastifyAdapter com @fastify/multipart (FileInterceptor/multer sao do Express e
 * quebram com 500). Aceita campos de texto antes ou depois do arquivo, le apenas UM arquivo, limita o tamanho por
 * requisicao (413) e nunca confia no mimetype informado: quem valida o tipo real e o servico (magic bytes).
 */
export async function readMultipartUpload(
  req: unknown,
  options: { maxBytes: number; fieldName?: string; maxFields?: number },
): Promise<MultipartUpload> {
  const request = req as MultipartRequest;
  if (typeof request.isMultipart !== 'function' || typeof request.parts !== 'function') {
    throw new UnsupportedMediaTypeException('Upload multipart indisponivel nesta rota.');
  }
  if (!request.isMultipart()) throw new UnsupportedMediaTypeException('A requisicao deve ser multipart/form-data.');

  const fieldName = options.fieldName ?? 'file';
  const fields: Record<string, string> = {};
  let file: UploadedBlob | undefined;
  try {
    const parts = request.parts({ limits: { fileSize: options.maxBytes, files: 1, fields: options.maxFields ?? 10, fieldSize: 8 * 1024 } });
    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname !== fieldName || file) {
          part.file.resume(); // descarta arquivo inesperado; o stream precisa ser consumido ou a requisicao trava
          throw new BadRequestException('Envie somente um arquivo no campo correto.');
        }
        const buffer: Buffer = await part.toBuffer(); // lanca RequestFileTooLargeError acima de maxBytes
        file = { fieldname: part.fieldname, originalname: String(part.filename ?? ''), mimetype: String(part.mimetype ?? ''), size: buffer.length, buffer };
      } else {
        fields[part.fieldname] = String(part.value ?? '');
      }
    }
  } catch (error: any) {
    if (error?.statusCode === 413 || error?.code === 'FST_REQ_FILE_TOO_LARGE') {
      throw new PayloadTooLargeException(`O arquivo deve ter no maximo ${Math.round(options.maxBytes / 1048576)} MB.`);
    }
    if (error?.getStatus) throw error;
    if (typeof error?.code === 'string' && error.code.startsWith('FST_')) {
      throw new BadRequestException('Upload multipart invalido.');
    }
    throw error;
  }
  return { file, fields };
}
