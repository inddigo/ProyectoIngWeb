import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

// Requiere PostgreSQL y el servicio Python levantados (docker compose up).
describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /health', () =>
    request(app.getHttpServer()).get('/health').expect(200));

  it('rechaza un pedido sin autenticación', () =>
    request(app.getHttpServer()).post('/api/v1/orders').send({}).expect(401));

  it('valida el DTO de estructuración', () =>
    request(app.getHttpServer())
      .post('/api/v1/orders/nlp-structure')
      .send({ rawText: 'hola', domain: 'plomeria' })
      .expect(400));
});
