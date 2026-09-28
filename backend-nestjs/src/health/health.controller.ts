import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NlpService } from '../nlp/nlp.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nlpService: NlpService,
  ) {}

  /**
   * Estado del orquestador y sus dependencias. La base de datos es crítica
   * (503 si falla); el servicio Python no lo es porque existe degradación.
   */
  @Get()
  async check() {
    let database: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    const pythonService = (await this.nlpService.isHealthy()) ? 'up' : 'down';

    const body = {
      status: database === 'up' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: { nestjs: 'up', database, pythonService },
    };

    if (database === 'down') {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
