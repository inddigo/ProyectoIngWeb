import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, retry } from 'rxjs';
import { Domain, SUPPORTED_DOMAINS } from '../common/constants/domains';
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
  returned_count: number;
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
  private identityToken?: { value: string; expiresAt: number };

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

  private async buildHeaders(): Promise<Record<string, string>> {
    const correlationId = getCurrentCorrelationId();
    const headers: Record<string, string> = correlationId
      ? { 'X-Correlation-Id': correlationId }
      : {};
    const audience = this.configService.get<string>('PYTHON_AUTH_AUDIENCE');
    if (audience) {
      if (!this.identityToken || this.identityToken.expiresAt <= Date.now()) {
        const response = await fetch(
          'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity' +
            `?audience=${encodeURIComponent(audience)}&format=full`,
          {
            headers: { 'Metadata-Flavor': 'Google' },
            signal: AbortSignal.timeout(3000),
          },
        );
        if (!response.ok)
          throw new Error('No se pudo autenticar con el servicio Python');
        this.identityToken = {
          value: await response.text(),
          expiresAt: Date.now() + 300000,
        };
      }
      headers.Authorization = `Bearer ${this.identityToken.value}`;
    }
    return headers;
  }

  async structureOrder(
    rawText: string,
    domain: Domain,
  ): Promise<StructuredOrderResult> {
    try {
      const headers = await this.buildHeaders();
      const response = await firstValueFrom(
        this.httpService
          .post<StructuredOrderResult>(
            `${this.baseUrl}/api/v1/nlp/structure-order`,
            { raw_text: rawText, domain },
            { timeout: 10000, headers },
          )
          .pipe(retry({ count: 1, delay: 150 })),
      );
      if (
        !this.isValidResult(response.data) ||
        response.data.domain !== domain ||
        response.data.raw_text !== rawText
      ) {
        throw new Error('Respuesta del servicio NLP con formato inválido');
      }
      return response.data;
    } catch (error) {
      this.logger.warn(
        `Servicio NLP no disponible, usando respuesta degradada: ${(error as Error).name}`,
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
          { timeout: 4000, headers: await this.buildHeaders() },
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
          headers: await this.buildHeaders(),
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
      typeof d.raw_text === 'string' &&
      SUPPORTED_DOMAINS.includes(d.domain) &&
      typeof d.entities === 'object' &&
      d.entities !== null &&
      !Array.isArray(d.entities) &&
      typeof d.entities.confidence_score === 'number' &&
      Number.isFinite(d.entities.confidence_score) &&
      d.entities.confidence_score >= 0 &&
      d.entities.confidence_score <= 1 &&
      Array.isArray(d.web_references) &&
      d.web_references.length <= 4 &&
      d.web_references.every(
        (ref) =>
          !!ref &&
          typeof ref.title === 'string' &&
          typeof ref.source === 'string' &&
          this.isHttpsUrl(ref.image_url) &&
          (ref.source_url == null || this.isHttpsUrl(ref.source_url)) &&
          (ref.retrieved_at == null ||
            Number.isFinite(Date.parse(ref.retrieved_at))),
      ) &&
      (d.extraction_meta === undefined ||
        (!!d.extraction_meta &&
          typeof d.extraction_meta.query_used === 'string' &&
          typeof d.extraction_meta.cache_hit === 'boolean' &&
          typeof d.extraction_meta.fallback_used === 'boolean' &&
          [
            'raw_count',
            'valid_count',
            'returned_count',
            'invalid_dropped',
            'duplicates_removed',
            'latency_ms',
          ].every((key) => {
            const value = (
              d.extraction_meta as unknown as Record<string, unknown>
            )[key];
            return (
              typeof value === 'number' && Number.isFinite(value) && value >= 0
            );
          })))
    );
  }

  private isHttpsUrl(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      return (
        url.protocol === 'https:' &&
        !!url.hostname &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }
}
