import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { NetworkService } from './core/services/network.service';
import { SwUpdate } from '@angular/service-worker';
import { signal } from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet, IonButton],
  template: `
    <ion-app>
      @if (!network.online()) {
        <div class="offline-banner" role="status">
          Sin conexión. Para enviar pedidos o actualizar datos necesitas volver a conectarte.
        </div>
      }
      @if (updateReady()) {
        <div class="offline-banner" role="status">Hay una nueva versión. Guarda tu trabajo antes de actualizar.
          <ion-button size="small" (click)="reload()">Actualizar aplicación</ion-button>
        </div>
      }
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
})
export class AppComponent implements OnInit {
  readonly network = inject(NetworkService);
  private readonly updates = inject(SwUpdate, { optional: true });
  readonly updateReady = signal(false);

  ngOnInit(): void {
    this.network.init();
    if (this.updates?.isEnabled) {
      this.updates.versionUpdates.subscribe(event => {
        if (event.type === 'VERSION_READY') this.updateReady.set(true);
      });
      this.updates.checkForUpdate().catch(() => undefined);
    }
  }

  reload(): void { window.location.reload(); }
}
