import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { reportError } from '../observability';
import { responseMeta } from '../request-id';
import { fieldLabel } from './friendly-validation';

export interface MappedError {
  status: number;
  body: { message: string | string[]; code?: string; [key: string]: unknown };
  log: boolean;
}

const PRISMA_FIELD = (meta: any) => {
  const target = meta?.target;
  const list = (Array.isArray(target) ? target : typeof target === 'string' ? [target] : []).filter((f: string) => f !== 'companyId');
  const fields = list.map((f: string) => fieldLabel(String(f))).join(', ');
  return fields ? ` (${fields})` : '';
};

/** Troca mensagens padrão do framework (em inglês/técnicas) por frases que o cliente entende. */
function friendlyGeneric(status: number, message: string): string {
  const m = message.trim().toLowerCase();
  if (m === 'unauthorized' || m === 'unauthorized exception') return 'Sua sessão expirou. Entre novamente para continuar.';
  if (m === 'forbidden' || m === 'forbidden resource') return 'Você não tem permissão para fazer isso. Fale com o administrador da sua empresa.';
  if (m === 'not found' || m.startsWith('cannot ')) return 'Não encontramos o que você procurou.';
  if (m === 'bad request') return 'Não foi possível concluir. Confira os dados informados.';
  if (m === 'conflict') return 'Essa informação já existe ou está em uso.';
  if (m === 'internal server error') return 'Algo deu errado do nosso lado. Tente novamente em instantes.';
  if (m === 'service unavailable') return 'O serviço está temporariamente indisponível. Tente novamente em instantes.';
  return message;
}

/** Converte qualquer exceção em resposta HTTP previsível: nunca devolve 500 por erro de dados do cliente. */
export function mapException(exception: unknown): MappedError {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    if (status === 429) {
      return { status, body: { message: 'Você fez muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo. Isso vale só para a sua conta; os demais usuários não são afetados.', code: 'TOO_MANY_ATTEMPTS' }, log: false };
    }
    if (typeof response === 'string') return { status, body: { message: friendlyGeneric(status, response) }, log: status >= 500 };
    const { message, ...rest } = response as Record<string, any>;
    const text = typeof message === 'string' ? friendlyGeneric(status, message) : message ?? exception.message;
    return { status, body: { message: text, ...rest }, log: status >= 500 };
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

const DEFAULT_CODES: Record<number, string> = {
  400: 'BAD_REQUEST', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE', 422: 'BUSINESS_RULE_VIOLATION', 429: 'TOO_MANY_REQUESTS', 500: 'INTERNAL_ERROR',
  502: 'UPSTREAM_INVALID_RESPONSE', 503: 'SERVICE_UNAVAILABLE', 504: 'UPSTREAM_TIMEOUT',
};

export function defaultErrorCode(status: number): string {
  return DEFAULT_CODES[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
}

/** O cliente pode repetir a mesma requisição com chance de sucesso (limite, indisponibilidade, timeout). */
export function isRetryable(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const mapped = mapException(exception);

    const meta = responseMeta(request);
    let requestId: string | undefined;
    if (mapped.status >= 500) {
      requestId = meta.requestId ?? randomBytes(4).toString('hex');
      const detail = exception instanceof Error ? exception.stack ?? exception.message : String(exception);
      this.logger.error(`[${requestId}] ${request?.method} ${request?.url} -> ${mapped.status}\n${detail}`);
      mapped.body.message = `Algo deu errado do nosso lado. Tente novamente; se continuar, informe o código ${requestId} ao suporte.`;
      mapped.body.requestId = requestId;
      reportError(exception, { requestId, method: request?.method, url: request?.url });
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
      timestamp: meta.timestamp,
      // `error.message` e `statusCode` são o contrato legado; `code`, `retryable` e `meta` são aditivos.
      error: { ...mapped.body, code: mapped.body.code ?? defaultErrorCode(mapped.status), retryable: isRetryable(mapped.status) },
      meta: { requestId: requestId ?? meta.requestId, timestamp: meta.timestamp },
    });
  }
}
