import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Network } from '@capacitor/network';

/**
 * Estado de conectividad. En Android usa el plugin nativo de Capacitor y en
 * navegador/PWA el mismo plugin recurre a los eventos online/offline.
 */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  private readonly zone = inject(NgZone);
  readonly online = signal(true);

  async init(): Promise<void> {
    try {
      const status = await Network.getStatus();
      this.online.set(status.connected);
      await Network.addListener('networkStatusChange', (s) =>
        this.zone.run(() => this.online.set(s.connected)),
      );
    } catch {
      this.online.set(typeof navigator === 'undefined' || navigator.onLine);
    }
  }
}
