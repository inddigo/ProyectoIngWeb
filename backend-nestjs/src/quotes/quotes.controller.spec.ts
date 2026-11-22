import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';

describe('Contratos HTTP de recomendación y privacidad', () => {
  let app: INestApplication;
  const recommendations = { calculate: jest.fn(), profile: jest.fn() };
  const auth = { updateAccount: jest.fn() };
  const orderId = '8f14e45f-ceea-467a-9f6e-6a8b8c5e1a11';
  const costs = {
    items: [],
    laborCost: 12000,
    fixedCosts: 0,
    profitMargin: 30,
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [QuotesController, AuthController],
      providers: [
        { provide: QuotesService, useValue: {} },
        { provide: RecommendationsService, useValue: recommendations },
        { provide: AuthService, useValue: auth },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            userId: 'authenticated-owner',
            email: 'local@example.test',
            role: req.headers['x-test-role'] ?? 'BAKER',
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    recommendations.calculate.mockResolvedValue({ suggestedTotal: 15600 });
    auth.updateAccount.mockResolvedValue({ name: 'Nombre actualizado' });
  });
  afterAll(() => app.close());
  it('usa la identidad autenticada al calcular', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/quotes/recommend/' + orderId)
      .send(costs)
      .expect(201);
    expect(recommendations.calculate).toHaveBeenCalledWith(
      orderId,
      'authenticated-owner',
      expect.objectContaining(costs),
    );
  });
  it('bloquea al cliente aunque conozca un identificador de pedido', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/quotes/recommend/' + orderId)
      .set('x-test-role', 'CLIENT')
      .send(costs)
      .expect(403);
    expect(recommendations.calculate).not.toHaveBeenCalled();
  });
  it('rechaza identificadores, costos y campos de identidad manipulados', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/quotes/recommend/no-es-uuid')
      .send(costs)
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/quotes/recommend/' + orderId)
      .send({ ...costs, professionalId: 'otro' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/quotes')
      .send({ orderId, estimatedPrice: 100, details: 'Detalle', breakdown: [] })
      .expect(400);
    expect(recommendations.calculate).not.toHaveBeenCalled();
  });
  it('permite corregir el nombre sin aceptar otro usuario como objetivo', async () => {
    await request(app.getHttpServer())
      .patch('/auth/account')
      .send({ name: '  Nombre actualizado  ' })
      .expect(200);
    expect(auth.updateAccount).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'authenticated-owner' }),
      'Nombre actualizado',
    );
    await request(app.getHttpServer())
      .patch('/auth/account')
      .send({ name: 'Otro', userId: 'victima' })
      .expect(400);
    expect(auth.updateAccount).toHaveBeenCalledTimes(1);
  });
});
