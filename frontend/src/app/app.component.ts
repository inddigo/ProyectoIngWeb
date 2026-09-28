import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { NetworkService } from './core/services/network.service';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      @if (!network.online()) {
        <div class="offline-banner" role="status">
          Sin conexión: los cambios se enviarán cuando vuelvas a estar en línea.
        </div>
      }
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
})
export class AppComponent implements OnInit {
  readonly network = inject(NetworkService);

  ngOnInit(): void {
    this.network.init();
  }
}
