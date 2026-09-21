import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';

describe('AppController', () => {
  let appController: AppController;
  let httpService: HttpService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: HttpService,
          useValue: {
            get: jest.fn().mockReturnValue(of({ data: { status: 'ok' } })),
            post: jest.fn().mockReturnValue(of({
              data: {
                raw_text: 'Torta para 20 personas',
                entities: { servings: 20, theme: 'General', dietary_restrictions: [], flavors: ['Chocolate'], confidence_score: 0.9 },
                web_references: []
              }
            }))
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:8000')
          }
        }
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    httpService = app.get<HttpService>(HttpService);
  });

  describe('health', () => {
    it('debe retornar estado de salud ok', async () => {
      const res = await appController.getHealth();
      expect(res.status).toBe('ok');
      expect(res.services.nestjs).toBe('up');
      expect(res.services.pythonService).toBe('up');
    });
  });

  describe('nlp-structure', () => {
    it('debe estructurar una orden enviada al microservicio Python', async () => {
      const res = await appController.structureOrder({ rawText: 'Torta para 20 personas' });
      expect(res.raw_text).toBe('Torta para 20 personas');
      expect(res.entities.servings).toBe(20);
    });
  });
});
