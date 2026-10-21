import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CorrelationLoggingInterceptor } from './common/interceptors/correlation-logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { configureHttpSecurity } from './common/http-security';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '32kb' }));
  configureHttpSecurity(app);

  const origins = (
    process.env.CORS_ORIGINS ??
    'http://localhost:4200,https://localhost,capacitor://localhost'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    exposedHeaders: ['X-Correlation-Id'],
  });

  app.useGlobalInterceptors(new CorrelationLoggingInterceptor());

  // Validación global de DTOs: rechaza campos no declarados y convierte tipos.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  const apiConfig = new DocumentBuilder()
    .setTitle('Cotiza API')
    .setDescription(
      'API principal: autenticación, pedidos, referencias web y cotizaciones.',
    )
    .setVersion('0.2.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, apiConfig),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`Backend escuchando en el puerto ${port}`, 'Bootstrap');
}
bootstrap();
