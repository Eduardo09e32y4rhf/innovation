import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { reportError } from '../observability';
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
      return { status, body: { message: 'Você fez muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.', code: 'TOO_MANY_ATTEMPTS' }, log: false };
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

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const mapped = mapException(exception);

    // 503 escrito de propósito (ex.: "Concilie ou cancele a cobrança...") orienta quem opera: mostra a mensagem em vez da genérica.
    const operational = mapped.status === 503 && exception instanceof HttpException && typeof mapped.body.message === 'string'
      && mapped.body.message !== friendlyGeneric(503, 'service unavailable');

    let requestId: string | undefined;
    if (operational) {
      this.logger.warn(`${request?.method} ${request?.url} -> 503: ${String(mapped.body.message)}`);
    } else if (mapped.status >= 500) {
      requestId = randomBytes(4).toString('hex');
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
      timestamp: new Date().toISOString(),
      error: mapped.body,
    });
  }
}
