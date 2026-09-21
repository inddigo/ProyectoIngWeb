import { Controller, Get, Post, Body } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Controller()
export class AppController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Get('health')
  async getHealth() {
    const pythonUrl = this.configService.get<string>('PYTHON_SERVICE_URL', 'http://localhost:8000');
    let pythonStatus = 'down';

    try {
      const response = await firstValueFrom(this.httpService.get(`${pythonUrl}/health`, { timeout: 3000 }));
      if (response.data?.status === 'ok') {
        pythonStatus = 'up';
      }
    } catch (e) {
      pythonStatus = 'unavailable';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        nestjs: 'up',
        pythonService: pythonStatus,
      },
    };
  }

  @Post('api/v1/orders/nlp-structure')
  async structureOrder(@Body() body: { rawText: string }) {
    const pythonUrl = this.configService.get<string>('PYTHON_SERVICE_URL', 'http://localhost:8000');
    
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${pythonUrl}/api/v1/nlp/structure-order`, { raw_text: body.rawText }, { timeout: 5000 })
      );
      return response.data;
    } catch (error) {
      // Degradación controlada / Fallback
      return {
        raw_text: body.rawText,
        entities: {
          servings: 10,
          theme: 'Personalizada',
          dietary_restrictions: [],
          flavors: ['Tradicional'],
          confidence_score: 0.5,
        },
        web_references: [],
        fallback: true,
      };
    }
  }
}
