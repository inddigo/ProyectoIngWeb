import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  checkmarkOutline,
  closeOutline,
  logOutOutline,
} from 'ionicons/icons';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { apiErrorMessage } from '../../core/interceptors/error.interceptor';
import {
  DOMAIN_LABELS,
  Order,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../core/models/order.model';
import {
  attributeEntries,
  attributeLabel,
  formatAttribute,
} from '../../shared/attributes';
import { Router } from '@angular/router';

@Component({
  selector: 'app-client-dashboard',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonChip,
    IonText,
    IonSkeletonText,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Mis pedidos</ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/">
            <ion-icon slot="start" name="add-outline"></ion-icon>
            <span class="ion-hide-sm-down">Nuevo pedido</span>
          </ion-button>
          <ion-button (click)="logout()" aria-label="Cerrar sesión">
            <ion-icon slot="icon-only" name="log-out-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="page-container">
        @if (loading() && !orders().length) {
          @for (i of [1, 2]; track i) {
            <ion-card><ion-card-content>
              <ion-skeleton-text [animated]="true" style="width: 60%"></ion-skeleton-text>
              <ion-skeleton-text [animated]="true" style="width: 90%"></ion-skeleton-text>
            </ion-card-content></ion-card>
          }
        } @else if (!orders().length) {
          <div class="empty-state">
            <p>Aún no has realizado pedidos.</p>
            <ion-button routerLink="/">Crear mi primer pedido</ion-button>
          </div>
        }

        <ion-grid>
          <ion-row>
            @for (order of orders(); track order.id) {
              <ion-col size="12" sizeMd="6" sizeXl="4">
                <ion-card>
                  <ion-card-header>
                    <ion-card-subtitle>
                      {{ domainLabels[order.domain] || order.domain }} · {{ order.createdAt | date: 'short' }}
                    </ion-card-subtitle>
                    <ion-card-title>
                      Pedido #{{ order.id.slice(0, 8) }}
                    </ion-card-title>
                    <div><ion-badge [color]="statusColors[order.status]">{{ statusLabels[order.status] }}</ion-badge></div>
                  </ion-card-header>
                  <ion-card-content>
                    <p class="muted">"{{ order.rawText }}"</p>
                    <div class="attr-chips">
                      @for (entry of entries(order); track entry[0]) {
                        <ion-chip [outline]="true">{{ label(entry[0]) }}: {{ format(entry[1]) }}</ion-chip>
                      }
                    </div>

                    @if (order.status === 'QUOTED' && order.quote) {
                      <h2 class="ion-margin-top">
                        <strong>{{ +order.quote.estimatedPrice | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</strong>
                      </h2>
                      <p>{{ order.quote.details }}</p>
                      <ion-row>
                        <ion-col size="7">
                          <ion-button expand="block" color="success" [disabled]="processing()" (click)="decide(order, true)">
                            <ion-icon slot="start" name="checkmark-outline"></ion-icon>Aceptar
                          </ion-button>
                        </ion-col>
                        <ion-col size="5">
                          <ion-button expand="block" fill="outline" color="danger" [disabled]="processing()" (click)="decide(order, false)">
                            <ion-icon slot="start" name="close-outline"></ion-icon>Rechazar
                          </ion-button>
                        </ion-col>
                      </ion-row>
                    } @else if (order.status === 'CONFIRMED_BY_CLIENT') {
                      <ion-text color="warning"><p>El profesional está revisando tu pedido.</p></ion-text>
                    } @else if (order.status === 'ACCEPTED_BY_CLIENT' && order.quote) {
                      <ion-text color="success">
                        <p>Aceptaste la cotización de
                          {{ +order.quote.estimatedPrice | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}.
                          El profesional te contactará para coordinar.</p>
                      </ion-text>
                    } @else if (order.status === 'REJECTED_BY_CLIENT') {
                      <ion-text color="danger"><p>Rechazaste esta cotización.</p></ion-text>
                    }
                  </ion-card-content>
                </ion-card>
              </ion-col>
            }
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>
  `,
})
export class ClientDashboardComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly alertCtrl = inject(AlertController);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(false);
  readonly processing = signal(false);

  readonly domainLabels = DOMAIN_LABELS;
  readonly statusLabels = STATUS_LABELS;
  readonly statusColors = STATUS_COLORS;
  readonly label = attributeLabel;
  readonly format = formatAttribute;
  readonly entries = (order: Order) => attributeEntries(order.attributes);

  ngOnInit(): void {
    this.load();
  }

  load(done?: () => void): void {
    this.loading.set(true);
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
        done?.();
      },
      error: () => {
        this.loading.set(false);
        done?.();
      },
    });
  }

  refresh(event: RefresherCustomEvent): void {
    this.load(() => event.target.complete());
  }

  async decide(order: Order, accept: boolean): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: accept ? 'Aceptar cotización' : 'Rechazar cotización',
      message: accept
        ? '¿Confirmas que aceptas esta cotización?'
        : '¿Seguro que quieres rechazarla? Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: accept ? 'Aceptar' : 'Rechazar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') return;

    this.processing.set(true);
    this.orderService
      .decide(order.id, accept ? 'ACCEPTED_BY_CLIENT' : 'REJECTED_BY_CLIENT')
      .subscribe({
        next: (updated) => {
          this.orders.update((list) =>
            list.map((o) => (o.id === updated.id ? updated : o)),
          );
          this.processing.set(false);
          this.notify.show(accept ? 'Cotización aceptada' : 'Cotización rechazada', accept ? 'success' : 'medium');
        },
        error: (err) => {
          this.processing.set(false);
          this.notify.show(apiErrorMessage(err, 'No se pudo registrar tu decisión'), 'danger');
        },
      });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}

addIcons({ addOutline, checkmarkOutline, closeOutline, logOutOutline });
