import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

export const correlationStorage = new AsyncLocalStorage<{
  correlationId: string;
}>();

export function getCurrentCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

@Injectable()
export class CorrelationLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpObservability');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const incomingId =
      req.headers['x-correlation-id'] ?? req.headers['x-request-id'];
    const correlationId =
      typeof incomingId === 'string' && incomingId.trim().length > 0
        ? incomingId.trim()
        : randomUUID();

    res.setHeader('X-Correlation-Id', correlationId);
    const start = Date.now();

    return correlationStorage.run({ correlationId }, () =>
      next.handle().pipe(
        tap({
          next: () => {
            this.emitLog(
              req,
              res.statusCode,
              Date.now() - start,
              correlationId,
            );
          },
          error: (err: { status?: number; message?: string }) => {
            const status = typeof err?.status === 'number' ? err.status : 500;
            this.emitLog(
              req,
              status,
              Date.now() - start,
              correlationId,
              err?.message,
            );
          },
        }),
      ),
    );
  }

  private emitLog(
    req: Request,
    statusCode: number,
    durationMs: number,
    correlationId: string,
    error?: string,
  ): void {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO',
      service: 'backend-nestjs',
      event: 'http_request',
      correlationId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      durationMs,
      ...(error ? { error } : {}),
    });
    if (statusCode >= 500) {
      this.logger.error(entry);
    } else if (statusCode >= 400) {
      this.logger.warn(entry);
    } else {
      this.logger.log(entry);
    }
  }
}
