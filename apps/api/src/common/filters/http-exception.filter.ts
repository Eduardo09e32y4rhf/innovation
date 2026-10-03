import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';

export interface MappedError {
  status: number;
  body: { message: string | string[]; code?: string; [key: string]: unknown };
  log: boolean;
}

const PRISMA_FIELD = (meta: any) => {
  const target = meta?.target;
  const fields = Array.isArray(target) ? target.join(', ') : typeof target === 'string' ? target : '';
  return fields ? ` (${fields})` : '';
};

/** Converte qualquer exceção em resposta HTTP previsível: nunca devolve 500 por erro de dados do cliente. */
export function mapException(exception: unknown): MappedError {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    if (typeof response === 'string') return { status, body: { message: response }, log: status >= 500 };
    const { message, ...rest } = response as Record<string, any>;
    return { status, body: { message: message ?? exception.message, ...rest }, log: status >= 500 };
  }

  const error = exception as { code?: string; name?: string; message?: string; meta?: any; statusCode?: number; status?: number };

  if (error?.name === 'PrismaClientKnownRequestError' || (typeof error?.code === 'string' && /^P\d{4}$/.test(error.code))) {
    switch (error.code) {
      case 'P2002':
        return { status: HttpStatus.CONFLICT, body: { message: `Já existe um registro com estes dados${PRISMA_FIELD(error.meta)}.`, code: 'DUPLICATE' }, log: false };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, body: { message: 'Registro não encontrado.', code: 'NOT_FOUND' }, log: false };
      case 'P2003':
        return { status: HttpStatus.CONFLICT, body: { message: 'Operação bloqueada: o registro está vinculado a outros dados ou referencia algo que não existe.', code: 'RELATION' }, log: false };
      case 'P2000':
        return { status: HttpStatus.BAD_REQUEST, body: { message: 'Um dos valores enviados é maior que o permitido.', code: 'TOO_LONG' }, log: false };
      case 'P2023':
        return { status: HttpStatus.BAD_REQUEST, body: { message: 'Identificador inválido.', code: 'INVALID_ID' }, log: false };
      case 'P2034':
        return { status: HttpStatus.CONFLICT, body: { message: 'Conflito de concorrência. Tente novamente.', code: 'CONFLICT' }, log: false };
      default:
        break;
    }
  }
  if (error?.name === 'PrismaClientValidationError') {
    return { status: HttpStatus.BAD_REQUEST, body: { message: 'Dados inválidos para esta operação.', code: 'VALIDATION' }, log: true };
  }

  // Erros do Fastify (corpo grande demais, JSON inválido, mídia não suportada...)
  const fastifyStatus = Number(error?.statusCode ?? error?.status);
  if (Number.isInteger(fastifyStatus) && fastifyStatus >= 400 && fastifyStatus < 500) {
    const messages: Record<number, string> = { 400: 'Requisição inválida.', 413: 'O arquivo ou corpo enviado é grande demais.', 415: 'Formato de conteúdo não suportado.', 429: 'Muitas requisições. Aguarde e tente novamente.' };
    return { status: fastifyStatus, body: { message: messages[fastifyStatus] ?? 'Requisição inválida.', code: error?.code }, log: false };
  }

  return { status: HttpStatus.INTERNAL_SERVER_ERROR, body: { message: 'Erro interno.' }, log: true };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const mapped = mapException(exception);

    let requestId: string | undefined;
    if (mapped.status >= 500) {
      requestId = randomBytes(4).toString('hex');
      const detail = exception instanceof Error ? exception.stack ?? exception.message : String(exception);
      this.logger.error(`[${requestId}] ${request?.method} ${request?.url} -> ${mapped.status}\n${detail}`);
      mapped.body.message = `Erro interno. Informe o código ${requestId} ao suporte se persistir.`;
      mapped.body.requestId = requestId;
    } else if (mapped.log) {
      this.logger.warn(`${request?.method} ${request?.url} -> ${mapped.status}: ${JSON.stringify(mapped.body)}`);
    }

    // Respostas em streaming (PDF) podem já ter começado: não há como trocar o status.
    if (response?.sent || response?.raw?.headersSent) {
      try { response.raw?.end?.(); } catch { /* conexão já encerrada */ }
      return;
    }

    response.status(mapped.status).send({
      success: false,
      statusCode: mapped.status,
      path: request?.url,
      timestamp: new Date().toISOString(),
      error: mapped.body,
    });
  }
}
