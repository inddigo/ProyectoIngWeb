import { defer, of, throwError } from 'rxjs';
import { NlpService } from './nlp.service';

describe('NlpService', () => {
  const http = { post: jest.fn(), get: jest.fn() };
  const config = {
    get: jest.fn((key: string) =>
      key === 'PYTHON_SERVICE_URL' ? 'http://python:8000' : undefined,
    ),
  };
  const service = new NlpService(http as any, config as any);

  beforeEach(() => jest.clearAllMocks());

  it('reenvía el texto al servicio Python con el contrato esperado', async () => {
    const data = {
      raw_text: 'torta',
      domain: 'cake',
      entities: { servings: 20, confidence_score: 0.9 },
      web_references: [],
    };
    http.post.mockReturnValue(of({ data }));
    await expect(service.structureOrder('torta', 'cake')).resolves.toEqual(
      data,
    );
    expect(http.post).toHaveBeenCalledWith(
      'http://python:8000/api/v1/nlp/structure-order',
      { raw_text: 'torta', domain: 'cake' },
      expect.any(Object),
    );
  });

  it('reintenta una vez ante un error transitorio y tiene éxito', async () => {
    let attempts = 0;
    const data = {
      raw_text: 'torta',
      domain: 'cake',
      entities: { servings: 10, confidence_score: 0.9 },
      web_references: [],
    };
    http.post.mockReturnValue(
      defer(() => {
        attempts += 1;
        if (attempts === 1) {
          return throwError(() => new Error('ECONNRESET'));
        }
        return of({ data });
      }),
    );

    const res = await service.structureOrder('torta', 'cake');
    expect(res).toEqual(data);
    expect(attempts).toBe(2);
  });

  it('devuelve una respuesta degradada si Python falla tras el reintento', async () => {
    http.post.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));
    const res = await service.structureOrder('torta', 'tattoo');
    expect(res.fallback).toBe(true);
    expect(res.domain).toBe('tattoo');
  });

  it('trata un contrato inválido como fallo', async () => {
    http.post.mockReturnValue(of({ data: { foo: 'bar' } }));
    expect((await service.structureOrder('torta', 'cake')).fallback).toBe(true);
  });

  it.each([
    {
      raw_text: 'torta',
      domain: 'cake',
      entities: { confidence_score: 2 },
      web_references: [],
    },
    { raw_text: 'torta', domain: 'cake', entities: [], web_references: [] },
    {
      raw_text: 'otro pedido',
      domain: 'cake',
      entities: { confidence_score: 0.9 },
      web_references: [],
    },
    {
      raw_text: 'torta',
      domain: 'tattoo',
      entities: { confidence_score: 0.9 },
      web_references: [],
    },
    {
      raw_text: 'torta',
      domain: 'cake',
      entities: { confidence_score: 0.9 },
      web_references: [null],
    },
    {
      raw_text: 'torta',
      domain: 'cake',
      entities: { confidence_score: 0.9 },
      web_references: [
        {
          title: 'Referencia',
          source: 'web',
          image_url: 'javascript:alert(1)',
        },
      ],
    },
  ])(
    'rechaza respuestas corruptas antes de enviarlas al frontend (%j)',
    async (data) => {
      http.post.mockReturnValue(of({ data }));
      expect((await service.structureOrder('torta', 'cake')).fallback).toBe(
        true,
      );
    },
  );

  it('autentica las llamadas al servicio Python con el secreto compartido', async () => {
    const renderConfig = {
      get: (key: string) =>
        key === 'PYTHON_SERVICE_TOKEN'
          ? 'test-service-token'
          : 'https://nlp.example.org',
    };
    const renderService = new NlpService(http as any, renderConfig as any);
    http.get.mockReturnValue(of({ data: { status: 'ok' } }));
    expect(await renderService.isHealthy()).toBe(true);
    expect(http.get).toHaveBeenCalledWith(
      'https://nlp.example.org/health',
      expect.objectContaining({
        headers: { 'X-Service-Token': 'test-service-token' },
      }),
    );
  });

  it('obtiene métricas del servicio Python o responde unavailable si falla', async () => {
    http.get.mockReturnValueOnce(
      of({ data: { web_retrieval: { total_requests: 5 } } }),
    );
    await expect(service.getMetrics()).resolves.toEqual({
      web_retrieval: { total_requests: 5 },
    });

    http.get.mockReturnValueOnce(throwError(() => new Error('timeout')));
    await expect(service.getMetrics()).resolves.toEqual({
      status: 'unavailable',
    });
  });
});
