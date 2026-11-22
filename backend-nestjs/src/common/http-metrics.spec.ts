import { HttpMetrics } from './http-metrics';

describe('Métricas y alertas básicas', () => {
  it('no inventa tasas cuando no hay observaciones', () => {
    expect(new HttpMetrics().snapshot()).toMatchObject({
      recentRequests: 0,
      serverErrorRate: null,
      p95LatencyMs: null,
      alerts: [],
    });
  });
  it('detecta errores, latencia y caducidad de la ventana', () => {
    const metrics = new HttpMetrics();
    for (let i = 0; i < 5; i++)
      metrics.record(i === 0 ? 503 : 200, 6000, 100000);
    expect(metrics.snapshot(100001).alerts).toEqual([
      'high_server_error_rate',
      'high_latency',
    ]);
    expect(metrics.snapshot(160001).alerts).toEqual([]);
    expect(metrics.snapshot(160001).requestsTotal).toBe(5);
  });
  it('acota la memoria y conserva contadores globales', () => {
    const metrics = new HttpMetrics();
    for (let i = 0; i < 1000; i++) metrics.record(200, i, 100000);
    expect(metrics.snapshot(100001)).toMatchObject({
      requestsTotal: 1000,
      recentRequests: 256,
    });
  });
});
