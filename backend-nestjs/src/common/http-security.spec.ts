import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { json } from 'express';
import * as request from 'supertest';
import { configureHttpSecurity } from './http-security';

@Controller('auth')
class LoginProbe {
  @Post('login')
  login(@Body() body: { email: string }) {
    return { email: body.email };
  }
}

describe('Controles HTTP', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [LoginProbe],
    }).compile();
    app = module.createNestApplication({ bodyParser: false });
    app.use(json({ limit: '32kb' }));
    configureHttpSecurity(app);
    await app.init();
  });
  afterAll(() => app.close());

  it('limita intentos por cuenta sin permitir evasión cambiando X-Forwarded-For o mayúsculas', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', `192.0.2.${i}`)
        .send({ email: i % 2 ? 'A@test.local' : 'a@test.local' })
        .expect(201);
    }
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@test.local' })
      .expect(429);
    expect(response.headers['retry-after']).toBeDefined();
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'other@test.local' })
      .expect(201);
  });

  it('impide cachear respuestas de autenticación y oculta el servidor', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'headers@test.local' })
      .expect(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('rechaza cuerpos excesivos antes de procesar credenciales', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'oversize@test.local', password: 'x'.repeat(33_000) })
      .expect(413);
  });
});
