import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  FormArray,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
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
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  calculatorOutline,
  closeOutline,
  logOutOutline,
  sendOutline,
  trashOutline,
  flashOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { NotificationService } from '../../core/services/notification.service';
import { apiErrorMessage } from '../../core/interceptors/error.interceptor';
import {
  DOMAIN_LABELS,
  Order,
  OrderStatus,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../core/models/order.model';
import {
  attributeEntries,
  attributeLabel,
  formatAttribute,
} from '../../shared/attributes';
import {
  CostItem,
  CostSummary,
  defaultItems,
  itemCost,
  summarizeCosts,
} from '../../shared/cost-calculator';

type Filter = OrderStatus | 'ALL';

@Component({
  selector: 'app-baker-dashboard',
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
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
    IonNote,
    IonSkeletonText,
    IonModal,
    IonList,
    IonItem,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
  ],
  styles: `
    .reference-img {
      width: 100%;
      max-height: 220px;
      object-fit: cover;
      border-radius: 8px;
    }
    .summary p {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
    }
    .summary .total {
      font-size: 1.2rem;
      color: var(--ion-color-success-shade);
    }
    .ingredient-row {
      border-bottom: 1px solid var(--ion-color-light-shade);
      align-items: center;
    }
  `,
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Panel del profesional</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="logout()">
            <ion-icon slot="start" name="log-out-outline"></ion-icon>
            <span class="ion-hide-sm-down">Salir</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="filter()" (ionChange)="setFilter($any($event.detail.value))" [scrollable]="true">
          <ion-segment-button value="CONFIRMED_BY_CLIENT"><ion-label>Por cotizar</ion-label></ion-segment-button>
          <ion-segment-button value="QUOTED"><ion-label>Cotizados</ion-label></ion-segment-button>
          <ion-segment-button value="ACCEPTED_BY_CLIENT"><ion-label>Aceptados</ion-label></ion-segment-button>
          <ion-segment-button value="ALL"><ion-label>Todos</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="page-container">
        @if (loading() && !orders().length) {
          <ion-card><ion-card-content>
            <ion-skeleton-text [animated]="true" style="width: 50%"></ion-skeleton-text>
            <ion-skeleton-text [animated]="true" style="width: 80%"></ion-skeleton-text>
          </ion-card-content></ion-card>
        } @else if (!orders().length) {
          <div class="empty-state">
            <p>No hay pedidos en esta categoría.</p>
            <p>Los pedidos confirmados por los clientes aparecerán en "Por cotizar".</p>
          </div>
        }

        <ion-grid>
          <ion-row>
            @for (order of orders(); track order.id) {
              <ion-col size="12" sizeMd="6">
                <ion-card>
                  <ion-card-header>
                    <ion-card-subtitle>
                      {{ domainLabels[order.domain] || order.domain }} · {{ order.createdAt | date: 'short' }}
                    </ion-card-subtitle>
                    <ion-card-title>Pedido #{{ order.id.slice(0, 8) }}</ion-card-title>
                    <div>
                      <ion-badge [color]="statusColors[order.status]">{{ statusLabels[order.status] }}</ion-badge>
                      @if (order.confidenceScore !== null && order.confidenceScore !== undefined) {
                        <ion-note> · Confianza IA {{ (order.confidenceScore * 100).toFixed(0) }}%</ion-note>
                      }
                    </div>
                  </ion-card-header>
                  <ion-card-content>
                    <p class="muted">"{{ order.rawText }}"</p>
                    <div class="attr-chips">
                      @for (entry of entries(order); track entry[0]) {
                        <ion-chip [outline]="true">{{ label(entry[0]) }}: {{ format(entry[1]) }}</ion-chip>
                      }
                    </div>
                    @if (order.imageUrl) {
                      <p><strong>Imagen de referencia del cliente:</strong></p>
                      <img class="reference-img" [src]="order.imageUrl" alt="Referencia del cliente" loading="lazy" />
                    }
                    @if (order.webReferences.length) {
                      <p><strong>Referencias web:</strong></p>
                      <div class="references">
                        @for (ref of order.webReferences; track ref.imageUrl) {
                          <figure>
                            <img [src]="ref.imageUrl" [alt]="ref.title" loading="lazy" />
                            <figcaption>{{ ref.title }}</figcaption>
                          </figure>
                        }
                      </div>
                    }
                    @if (order.quote) {
                      <p class="ion-margin-top">
                        Cotizado en <strong>{{ +order.quote.estimatedPrice | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</strong>
                      </p>
                    }
                    @if (order.status === 'CONFIRMED_BY_CLIENT') {
                      <ion-button expand="block" class="ion-margin-top" (click)="openCalculator(order)">
                        <ion-icon slot="start" name="calculator-outline"></ion-icon>
                        Cotizar con calculadora de costos
                      </ion-button>
                    }
                  </ion-card-content>
                </ion-card>
              </ion-col>
            }
          </ion-row>
        </ion-grid>
      </div>

      <!-- Calculadora de costos: pantalla completa en móvil, diálogo en escritorio -->
      <ion-modal [isOpen]="!!activeOrder()" (didDismiss)="closeCalculator()">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>Cotizar pedido #{{ activeOrder()?.id?.slice(0, 8) }}</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="closeCalculator()" aria-label="Cerrar">
                  <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <form [formGroup]="calcForm" (ngSubmit)="submitQuote()">
              <h3>Insumos</h3>
              <ion-grid formArrayName="items" class="ion-no-padding">
                @for (group of itemsArray.controls; track group; let i = $index) {
                  <ion-row class="ingredient-row" [formGroupName]="i">
                    <ion-col size="12" sizeMd="3">
                      <ion-input formControlName="name" label="Insumo" labelPlacement="stacked"></ion-input>
                    </ion-col>
                    <ion-col size="6" sizeMd="2">
                      <ion-input formControlName="packageCost" type="number" inputmode="decimal" label="Costo presentación" labelPlacement="stacked"></ion-input>
                    </ion-col>
                    <ion-col size="6" sizeMd="2">
                      <ion-input formControlName="packageQuantity" type="number" inputmode="decimal" label="Cant. presentación" labelPlacement="stacked"></ion-input>
                    </ion-col>
                    <ion-col size="4" sizeMd="1">
                      <ion-select formControlName="unit" label="Unidad" labelPlacement="stacked" interface="popover">
                        @for (u of units; track u) {
                          <ion-select-option [value]="u">{{ u }}</ion-select-option>
                        }
                      </ion-select>
                    </ion-col>
                    <ion-col size="4" sizeMd="2">
                      <ion-input formControlName="quantityUsed" type="number" inputmode="decimal" label="Cant. usada" labelPlacement="stacked"></ion-input>
                    </ion-col>
                    <ion-col size="3" sizeMd="1">
                      <ion-note>{{ costOf(i) | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</ion-note>
                    </ion-col>
                    <ion-col size="1">
                      <ion-button fill="clear" color="danger" (click)="removeItem(i)" aria-label="Eliminar insumo">
                        <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                      </ion-button>
                    </ion-col>
                  </ion-row>
                }
              </ion-grid>
              <ion-button fill="outline" size="small" (click)="addItem()">
                <ion-icon slot="start" name="add-outline"></ion-icon>Agregar insumo
              </ion-button>

              <ion-grid>
                <ion-row>
                  <ion-col size="12" sizeMd="6">
                    <ion-list lines="none">
                      <ion-item>
                        <ion-input formControlName="laborCost" type="number" inputmode="decimal" label="Mano de obra ($)" labelPlacement="stacked" fill="outline"></ion-input>
                      </ion-item>
                      <ion-item>
                        <ion-input formControlName="fixedCosts" type="number" inputmode="decimal" label="Costos fijos / otros ($)" labelPlacement="stacked" fill="outline"></ion-input>
                      </ion-item>
                      <ion-item>
                        <ion-input formControlName="profitMargin" type="number" inputmode="decimal" label="Margen de ganancia (%)" labelPlacement="stacked" fill="outline"></ion-input>
                      </ion-item>
                    </ion-list>
                  </ion-col>
                  <ion-col size="12" sizeMd="6">
                    <ion-card class="summary">
                      <ion-card-content>
                        <p><span>Costo insumos</span><strong>{{ summary().ingredientsCost | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</strong></p>
                        <p><span>Costo total</span><strong>{{ summary().totalCost | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</strong></p>
                        <p><span>Ganancia</span><strong>{{ summary().profit | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</strong></p>
                        <p class="total"><span>Precio sugerido</span><strong>{{ summary().suggestedPrice | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</strong></p>
                        @if (ruleEstimate() !== null) {
                          <ion-text color="medium">
                            <p><span>Estimación por reglas</span><span>{{ ruleEstimate() | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</span></p>
                          </ion-text>
                        }
                        <ion-button size="small" fill="clear" (click)="useSuggested()">Usar precio sugerido</ion-button>
                        <ion-button size="small" fill="clear" (click)="loadRuleEstimate()">
                          <ion-icon slot="start" name="flash-outline"></ion-icon>Estimación por reglas
                        </ion-button>
                      </ion-card-content>
                    </ion-card>
                  </ion-col>
                </ion-row>
              </ion-grid>

              <ion-list lines="none">
                <ion-item>
                  <ion-input formControlName="finalPrice" type="number" inputmode="numeric" label="Precio final a cotizar ($)" labelPlacement="stacked" fill="outline" errorText="Ingresa un precio mayor a 0"></ion-input>
                </ion-item>
                <ion-item>
                  <ion-textarea formControlName="details" label="Detalle para el cliente" labelPlacement="stacked" fill="outline" [autoGrow]="true" errorText="Agrega un detalle para el cliente"></ion-textarea>
                </ion-item>
              </ion-list>

              <ion-button type="submit" expand="block" color="success" [disabled]="submitting()">
                <ion-icon slot="start" name="send-outline"></ion-icon>
                {{ submitting() ? 'Enviando...' : 'Enviar cotización' }}
              </ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
})
export class BakerDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly filter = signal<Filter>('CONFIRMED_BY_CLIENT');
  readonly activeOrder = signal<Order | null>(null);
  readonly ruleEstimate = signal<number | null>(null);
  private readonly costInputs = signal<CostItem[]>([]);
  private readonly extras = signal({ laborCost: 0, fixedCosts: 0, profitMargin: 30 });

  readonly summary = computed<CostSummary>(() =>
    summarizeCosts({ items: this.costInputs(), ...this.extras() }),
  );

  readonly units = ['g', 'kg', 'ml', 'L', 'u', 'h'];
  readonly domainLabels = DOMAIN_LABELS;
  readonly statusLabels = STATUS_LABELS;
  readonly statusColors = STATUS_COLORS;
  readonly label = attributeLabel;
  readonly format = formatAttribute;
  readonly entries = (order: Order) => attributeEntries(order.attributes);

  readonly calcForm = this.fb.group({
    items: this.fb.array<FormGroup>([]),
    laborCost: [0, Validators.min(0)],
    fixedCosts: [0, Validators.min(0)],
    profitMargin: [30, [Validators.min(0), Validators.max(500)]],
    finalPrice: [0, [Validators.required, Validators.min(1)]],
    details: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  get itemsArray(): FormArray<FormGroup> {
    return this.calcForm.controls.items;
  }

  ngOnInit(): void {
    this.calcForm.valueChanges.subscribe(() => this.syncCostInputs());
    this.load();
  }

  setFilter(filter: Filter): void {
    this.filter.set(filter);
    this.load();
  }

  load(done?: () => void): void {
    const f = this.filter();
    this.loading.set(true);
    this.orderService.getOrders(f === 'ALL' ? undefined : f).subscribe({
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

  openCalculator(order: Order): void {
    const attrs = order.attributes ?? {};
    const quantity = parseInt(String(attrs['servings'] ?? attrs['size'] ?? '10'), 10) || 10;

    this.itemsArray.clear({ emitEvent: false });
    for (const item of defaultItems(order.domain, quantity)) {
      this.itemsArray.push(this.itemGroup(item), { emitEvent: false });
    }
    const design = attrs['theme'] ?? attrs['style'] ?? 'personalizado';
    this.calcForm.patchValue({
      laborCost: order.domain === 'tattoo' ? 15000 * Math.ceil(quantity / 5) : 5000 + quantity * 100,
      fixedCosts: 2000,
      profitMargin: 30,
      details: `Cotización para ${DOMAIN_LABELS[order.domain] ?? order.domain}. Diseño: ${design}.`,
    });
    this.ruleEstimate.set(null);
    this.syncCostInputs();
    this.useSuggested();
    this.activeOrder.set(order);
  }

  closeCalculator(): void {
    this.activeOrder.set(null);
  }

  addItem(): void {
    this.itemsArray.push(
      this.itemGroup({ name: '', packageCost: 0, packageQuantity: 1, unit: 'u', quantityUsed: 0 }),
    );
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  costOf(index: number): number {
    return itemCost(this.costInputs()[index] ?? ({} as CostItem));
  }

  useSuggested(): void {
    this.calcForm.controls.finalPrice.setValue(Math.ceil(this.summary().suggestedPrice));
  }

  loadRuleEstimate(): void {
    const order = this.activeOrder();
    if (!order) return;
    this.orderService.estimateQuote(order.id).subscribe({
      next: (res) => this.ruleEstimate.set(res.suggestedTotal),
      error: (err) => this.notify.show(apiErrorMessage(err, 'No se pudo calcular la estimación'), 'danger'),
    });
  }

  submitQuote(): void {
    const order = this.activeOrder();
    if (!order) return;
    if (this.calcForm.invalid) {
      this.calcForm.markAllAsTouched();
      return;
    }
    const value = this.calcForm.getRawValue();
    this.submitting.set(true);
    this.orderService
      .submitQuote({
        orderId: order.id,
        estimatedPrice: Number(value.finalPrice),
        details: value.details,
        breakdown: {
          items: this.costInputs(),
          laborCost: Number(value.laborCost),
          fixedCosts: Number(value.fixedCosts),
          profitMargin: Number(value.profitMargin),
          ...this.summary(),
        },
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.activeOrder.set(null);
          this.orders.update((list) => list.filter((o) => o.id !== order.id));
          this.notify.show('Cotización enviada al cliente', 'success');
        },
        error: (err) => {
          this.submitting.set(false);
          this.notify.show(apiErrorMessage(err, 'No se pudo enviar la cotización'), 'danger');
        },
      });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private itemGroup(item: CostItem): FormGroup {
    return this.fb.group({
      name: [item.name],
      packageCost: [item.packageCost, Validators.min(0)],
      packageQuantity: [item.packageQuantity, Validators.min(0)],
      unit: [item.unit],
      quantityUsed: [item.quantityUsed, Validators.min(0)],
    });
  }

  private syncCostInputs(): void {
    const v = this.calcForm.getRawValue();
    this.costInputs.set(v.items as CostItem[]);
    this.extras.set({
      laborCost: Number(v.laborCost),
      fixedCosts: Number(v.fixedCosts),
      profitMargin: Number(v.profitMargin),
    });
  }
}

addIcons({
  addOutline,
  calculatorOutline,
  closeOutline,
  logOutOutline,
  sendOutline,
  trashOutline,
  flashOutline,
});
