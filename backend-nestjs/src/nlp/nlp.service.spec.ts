import { of, throwError } from 'rxjs';
import { NlpService } from './nlp.service';

describe('NlpService', () => {
  const http = { post: jest.fn(), get: jest.fn() };
  const config = { get: jest.fn(() => 'http://python:8000') };
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

  it('devuelve una respuesta degradada si Python falla', async () => {
    http.post.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));
    const res = await service.structureOrder('torta', 'tattoo');
    expect(res.fallback).toBe(true);
    expect(res.domain).toBe('tattoo');
  });

  it('trata un contrato inválido como fallo', async () => {
    http.post.mockReturnValue(of({ data: { foo: 'bar' } }));
    expect((await service.structureOrder('torta', 'cake')).fallback).toBe(true);
  });
});
