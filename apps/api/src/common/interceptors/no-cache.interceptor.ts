import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class NoCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    
    // Evita cache no Cloudflare, Nginx e Browsers para rotas da API
    if (typeof response.header === 'function') {
      response.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.header('Pragma', 'no-cache');
      response.header('Expires', '0');
      response.header('Surrogate-Control', 'no-store');
    } else if (typeof response.setHeader === 'function') {
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
      response.setHeader('Surrogate-Control', 'no-store');
    }

    return next.handle();
  }
}
