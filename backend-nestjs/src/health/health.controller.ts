import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NlpService } from '../nlp/nlp.service';
import { getCurrentCorrelationId } from '../common/interceptors/correlation-logging.interceptor';

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
    const start = Date.now();
    let database: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    const dbLatencyMs = Date.now() - start;

    const nlpStart = Date.now();
    const pythonService = (await this.nlpService.isHealthy()) ? 'up' : 'down';
    const nlpLatencyMs = Date.now() - nlpStart;

    const body = {
      status: database === 'up' ? 'ok' : 'error',
      revision:
        process.env.APP_REVISION ?? process.env.RENDER_GIT_COMMIT ?? 'local',
      timestamp: new Date().toISOString(),
      correlationId: getCurrentCorrelationId(),
      services: { nestjs: 'up', database, pythonService },
      metrics: {
        dbLatencyMs,
        nlpLatencyMs,
        totalCheckMs: Date.now() - start,
      },
    };

    if (database === 'down') {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
