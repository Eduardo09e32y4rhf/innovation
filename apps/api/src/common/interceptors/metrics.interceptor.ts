import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Counter, Histogram } from 'prom-client';

const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    
    // Normalize route to avoid high cardinality for IDs
    const route = url.replace(/\/[a-f0-9-]{36}/g, '/:id').split('?')[0];
    const endTimer = httpRequestDuration.startTimer();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const statusCode = res.statusCode || 200;
          httpRequestCounter.inc({ method, route, status_code: statusCode });
          endTimer({ method, route, status_code: statusCode });
        },
        error: (err) => {
          const statusCode = err.status || 500;
          httpRequestCounter.inc({ method, route, status_code: statusCode });
          endTimer({ method, route, status_code: statusCode });
        },
      }),
    );
  }
}
