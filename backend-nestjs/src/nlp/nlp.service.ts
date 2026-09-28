import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Domain } from '../common/constants/domains';

export interface WebReferenceResult {
  title: string;
  image_url: string;
  source: string;
}

export interface StructuredOrderResult {
  raw_text: string;
  domain: Domain;
  entities: Record<string, unknown> & { confidence_score?: number };
  web_references: WebReferenceResult[];
  fallback?: boolean;
}

/**
 * Cliente HTTP hacia el microservicio Python (FastAPI) de NLP.
 * Si el servicio no responde o responde con un contrato inválido, se
 * devuelve una respuesta degradada para que el cliente pueda continuar.
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

  async structureOrder(
    rawText: string,
    domain: Domain,
  ): Promise<StructuredOrderResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<StructuredOrderResult>(
          `${this.baseUrl}/api/v1/nlp/structure-order`,
          { raw_text: rawText, domain },
          { timeout: 10000 },
        ),
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

  async isHealthy(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/health`, { timeout: 3000 }),
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
