import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, retry } from 'rxjs';
import { Domain } from '../common/constants/domains';
import { getCurrentCorrelationId } from '../common/interceptors/correlation-logging.interceptor';

export interface WebReferenceResult {
  title: string;
  image_url: string;
  source: string;
  source_url?: string;
  license?: string;
  creator?: string;
  query_used?: string;
  retrieved_at?: string;
}

export interface ExtractionMetaResult {
  query_used: string;
  raw_count: number;
  valid_count: number;
  invalid_dropped: number;
  duplicates_removed: number;
  cache_hit: boolean;
  fallback_used: boolean;
  latency_ms: number;
}

export interface StructuredOrderResult {
  raw_text: string;
  domain: Domain;
  entities: Record<string, unknown> & { confidence_score?: number };
  web_references: WebReferenceResult[];
  extraction_meta?: ExtractionMetaResult;
  fallback?: boolean;
}

/**
 * Cliente HTTP hacia el microservicio Python (FastAPI) de NLP.
 * Incluye propagación de Correlation ID, reintentos limitados (1 reintento)
 * control de timeout (10 s), validación de contrato y degradación controlada.
 */
@Injectable()
export class NlpService {
  private readonly logger = new Logger(NlpService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl(): string {
    return this.configService.get<string>(
      'PYTHON_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  private buildHeaders(): Record<string, string> {
    const correlationId = getCurrentCorrelationId();
    return correlationId ? { 'X-Correlation-Id': correlationId } : {};
  }

  async structureOrder(
    rawText: string,
    domain: Domain,
  ): Promise<StructuredOrderResult> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .post<StructuredOrderResult>(
            `${this.baseUrl}/api/v1/nlp/structure-order`,
            { raw_text: rawText, domain },
            { timeout: 10000, headers: this.buildHeaders() },
          )
          .pipe(retry({ count: 1, delay: 150 })),
      );
      if (!this.isValidResult(response.data)) {
        throw new Error('Respuesta del servicio NLP con formato inválido');
      }
      return response.data;
    } catch (error) {
      this.logger.warn(
        `Servicio NLP no disponible, usando respuesta degradada: ${(error as Error).message}`,
      );
      return {
        raw_text: rawText,
        domain,
        entities: { confidence_score: 0 },
        web_references: [],
        fallback: true,
      };
    }
  }

  async getMetrics(): Promise<Record<string, unknown>> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<Record<string, unknown>>(
          `${this.baseUrl}/api/v1/nlp/metrics`,
          { timeout: 4000, headers: this.buildHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.warn(
        `No se pudieron obtener métricas del servicio NLP: ${(error as Error).message}`,
      );
      return { status: 'unavailable' };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/health`, {
          timeout: 3000,
          headers: this.buildHeaders(),
        }),
      );
      return response.data?.status === 'ok';
    } catch {
      return false;
    }
  }

  private isValidResult(data: unknown): data is StructuredOrderResult {
    const d = data as StructuredOrderResult;
    return (
      !!d &&
      typeof d.entities === 'object' &&
      d.entities !== null &&
      Array.isArray(d.web_references)
    );
  }
}
