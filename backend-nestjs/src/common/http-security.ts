import { INestApplication } from '@nestjs/common';
import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';

export function configureHttpSecurity(app: INestApplication): void {
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.removeHeader('X-Powered-By');
    next();
  });

  const options = {
    windowMs: 60_000,
    standardHeaders: 'draft-7' as const,
    legacyHeaders: false,
    message: {
      statusCode: 429,
      message: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
    },
  };
  // Presupuesto por instancia: no confiamos en X-Forwarded-For suministrado
  // por el cliente. El despliegue actual tiene una única réplica detrás de proxies.
  app.use(
    '/auth',
    rateLimit({ ...options, limit: 60, keyGenerator: () => 'auth' }),
  );
  app.use(
    '/api',
    rateLimit({ ...options, limit: 300, keyGenerator: () => 'api' }),
  );
  app.use(
    '/api/v1/orders/nlp-structure',
    rateLimit({ ...options, limit: 30, keyGenerator: () => 'nlp' }),
  );
  app.use(
    '/auth/login',
    rateLimit({
      ...options,
      limit: 10,
      keyGenerator: (req: Request) =>
        createHash('sha256')
          .update(
            typeof req.body?.email === 'string'
              ? req.body.email.trim().toLowerCase()
              : 'invalid',
          )
          .digest('hex'),
    }),
  );
}
