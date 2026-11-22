/** Ventana acotada por instancia; no conserva rutas, identidades ni cuerpos. */
export class HttpMetrics {
  private readonly samples: {
    at: number;
    status: number;
    durationMs: number;
  }[] = [];
  private requestsTotal = 0;
  private errorsTotal = 0;

  record(status: number, durationMs: number, at = Date.now()): void {
    this.requestsTotal++;
    if (status >= 500) this.errorsTotal++;
    this.samples.push({ at, status, durationMs });
    if (this.samples.length > 256) this.samples.shift();
  }

  snapshot(now = Date.now()) {
    const recent = this.samples.filter((s) => now - s.at <= 60000);
    const times = recent.map((s) => s.durationMs).sort((a, b) => a - b);
    const serverErrorRate = recent.length
      ? recent.filter((s) => s.status >= 500).length / recent.length
      : null;
    const p95LatencyMs = times.length
      ? times[Math.ceil(times.length * 0.95) - 1]
      : null;
    const alerts: string[] = [];
    if (recent.length >= 5 && (serverErrorRate ?? 0) >= 0.2)
      alerts.push('high_server_error_rate');
    if (recent.length >= 5 && (p95LatencyMs ?? 0) > 5000)
      alerts.push('high_latency');
    return {
      requestsTotal: this.requestsTotal,
      serverErrorsTotal: this.errorsTotal,
      windowSeconds: 60,
      sampleLimit: 256,
      recentRequests: recent.length,
      serverErrorRate,
      p95LatencyMs,
      alerts,
    };
  }
}

export const httpMetrics = new HttpMetrics();
