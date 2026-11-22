import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { OrdersToolbarComponent } from '../../shared/orders-toolbar.component';
import { filterOrders, OrderFilters } from '../../shared/order-filters';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfessionalSettingsComponent } from '../../shared/professional-settings.component';
import { RecommendationService } from '../../core/services/recommendation.service';
import { ProfessionalProfile, Recommendation } from '../../core/models/recommendation.model';
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
  IonList,
  IonModal,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonRow,
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


@Component({
  selector: 'app-baker-dashboard',
  imports: [
    OrdersToolbarComponent,
    ProfessionalSettingsComponent,
    RouterLink,
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
    .adaptive-panel {
      border: 1px solid var(--ion-color-primary);
      border-radius: 16px;
      padding: 18px;
      margin: 20px 0;
      line-height: 1.6;
    }
  `,
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Panel del profesional</ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/mi-cuenta">Mi cuenta</ion-button>
          <ion-button (click)="load()" [disabled]="loading()">Actualizar</ion-button>
          <ion-button (click)="logout()">
            <ion-icon slot="start" name="log-out-outline"></ion-icon>
            <span class="ion-hide-sm-down">Salir</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="page-container"><section class="dashboard-intro"><span class="eyebrow">Tu taller</span><h1>Ideas listas para cobrar vida.</h1><p>Organiza los pedidos, revisa sus detalles y prepara tu próxima cotización.</p></section>
        <app-professional-settings (profileChange)="profile.set($event)" />
        <app-orders-toolbar [orders]="orders()" [(filters)]="filters" />
        <p class="results-count" role="status">{{ visibleOrders().length }} de {{ orders().length }} pedidos</p>
        @if (orders().length && !visibleOrders().length) { <div class="empty-state"><p>No hay pedidos que coincidan con estos filtros.</p></div> }
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
            @for (order of visibleOrders(); track order.id) {
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
                            <figcaption>
                              {{ ref.title }}<br />
                              {{ ref.creator || 'Autor no informado' }} · {{ ref.license || 'Licencia no informada' }}<br />
                              {{ ref.source }}
                              @if (ref.sourceUrl) {
                                <br /><a [href]="ref.sourceUrl" target="_blank" rel="noopener noreferrer">Ver obra original y condiciones de uso</a>
                              }
                            </figcaption>
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
              @if (activeOrder()?.domain === 'general') { <p class="muted">Define materiales o recursos, mano de obra y costos fijos del encargo. El precio sugerido usa tus costos; no aplicamos reglas de otros rubros.</p> }
              <h3>Mi tiempo y costos</h3>
              <ion-input formControlName="hours" type="number" inputmode="decimal" label="Horas de trabajo estimadas" labelPlacement="stacked" fill="outline" />
              <ion-button fill="outline" size="small" type="button" (click)="applyProfile()" [disabled]="!profile()">Aplicar mi valor hora, costos fijos y recargo</ion-button>
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
                        <ion-input formControlName="profitMargin" type="number" inputmode="decimal" label="Recargo sobre costos (%)" labelPlacement="stacked" fill="outline"></ion-input>
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
                        <ion-button size="small" fill="clear" (click)="loadRuleEstimate()" [disabled]="activeOrder()?.domain === 'general'">
                          <ion-icon slot="start" name="flash-outline"></ion-icon>Estimación por reglas
                        </ion-button>
                      </ion-card-content>
                    </ion-card>
                  </ion-col>
                </ion-row>
              </ion-grid>

              <section class="adaptive-panel" aria-label="Recomendación de cotización">
                <h3>Una referencia para decidir</h3>
                <p>Compara tus costos con una sugerencia explicada. El precio final siempre lo decides tú.</p>
                <ion-button type="button" size="small" (click)="recommend('adaptive')" [disabled]="recommending() || calcForm.invalid && summary().totalCost <= 0">{{ recommending() ? 'Calculando…' : 'Obtener recomendación' }}</ion-button>
                <ion-button type="button" size="small" fill="outline" (click)="recommend('baseline')" [disabled]="recommending()">Comparar sin historial</ion-button>
                @if (recommendation(); as rec) {
                  <div role="status">
                    <p><strong>{{ rec.suggestedTotal | currency:'CLP':'symbol-narrow':'1.0-0' }}</strong> · {{ rec.adapted ? 'Ajustado a tu historial' : 'Basado en tus costos' }}</p>
                    <p>Base sin adaptación: {{ rec.baselineTotal | currency:'CLP':'symbol-narrow':'1.0-0' }} · Recargo aplicado: {{ rec.appliedMargin }}%</p>
                    <p>{{ rec.sampleCount }} trabajos aceptados comparables de {{ rec.decisionCount }} decisiones.</p>
                    @for (reason of rec.reasons; track reason) { <p>{{ reason }}</p> }
                    @for (warning of rec.warnings; track warning) { <p class="muted">{{ warning }}</p> }
                    <ion-button type="button" fill="outline" (click)="applyRecommendation()">Aplicar recomendación</ion-button>
                  </div>
                }
              </section>
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
  private readonly recommendations = inject(RecommendationService);
  readonly profile = signal<ProfessionalProfile | null>(null);
  readonly recommendation = signal<Recommendation | null>(null);
  readonly recommending = signal(false);
  private costSignature = '';

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly filters = signal<OrderFilters>({ query: '', domain: 'ALL', status: 'CONFIRMED_BY_CLIENT' });
  readonly visibleOrders = computed(() => filterOrders(this.orders(), this.filters()));
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
    hours: [0, [Validators.min(0), Validators.max(100000)]],
    laborCost: [0, Validators.min(0)],
    fixedCosts: [0, Validators.min(0)],
    profitMargin: [30, [Validators.min(0), Validators.max(500)]],
    finalPrice: [0, [Validators.required, Validators.min(1), Validators.max(99999999.99)]],
    details: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  get itemsArray(): FormArray<FormGroup> {
    return this.calcForm.controls.items;
  }

  ngOnInit(): void {
    this.calcForm.valueChanges.subscribe(() => this.syncCostInputs());
    this.load();
  }

  load(done?: () => void): void {
    this.loading.set(true);
    this.orderService.getOrders().subscribe({
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
    const quantity = parseInt(String(attrs['quantity'] ?? attrs['servings'] ?? attrs['size'] ?? '1'), 10) || 10;

    this.itemsArray.clear({ emitEvent: false });
    for (const item of defaultItems(order.domain, quantity)) {
      this.itemsArray.push(this.itemGroup(item), { emitEvent: false });
    }
    const design = attrs['service_type'] ?? attrs['theme'] ?? attrs['style'] ?? 'personalizado';
    this.calcForm.patchValue({
      hours: 0,
      laborCost: order.domain === 'general' ? 0 : order.domain === 'tattoo' ? 15000 * Math.ceil(quantity / 5) : 5000 + quantity * 100,
      fixedCosts: order.domain === 'general' ? 0 : 2000,
      profitMargin: 30,
      details: `Cotización para ${DOMAIN_LABELS[order.domain] ?? order.domain}. Diseño: ${design}.`,
    });
    this.ruleEstimate.set(null);
    this.recommendation.set(null);
    this.syncCostInputs();
    this.useSuggested();
    this.activeOrder.set(order);
  }

  closeCalculator(): void {
    this.activeOrder.set(null);
    this.recommendation.set(null);
  }

  applyProfile(): void {
    const p = this.profile();
    if (!p) return;
    this.calcForm.patchValue({ laborCost: Math.round(Number(this.calcForm.controls.hours.value) * p.hourlyRate), fixedCosts: p.fixedCosts, profitMargin: p.profitMargin });
    this.useSuggested();
  }

  recommend(mode: 'adaptive' | 'baseline'): void {
    const order = this.activeOrder();
    if (!order || this.recommending()) return;
    const value = this.calcForm.getRawValue();
    const costs = { items: this.costInputs(), laborCost: Number(value.laborCost), fixedCosts: Number(value.fixedCosts), profitMargin: Number(value.profitMargin) };
    const signature = this.costSignature;
    this.recommending.set(true);
    this.recommendations.calculate(order.id, costs, mode).subscribe({ next: result => {
      this.recommending.set(false);
      if (this.activeOrder()?.id === order.id && this.costSignature === signature) this.recommendation.set(result);
    }, error: e => { this.recommending.set(false); this.notify.show(apiErrorMessage(e, 'No se pudo obtener la recomendación'), 'danger'); } });
  }

  applyRecommendation(): void {
    const rec = this.recommendation();
    if (rec) this.calcForm.controls.finalPrice.setValue(rec.suggestedTotal);
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
    if (!order || order.domain === 'general') return;
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
        recommendationId: this.recommendation()?.id,
        breakdown: {
          items: this.costInputs(),
          laborCost: Number(value.laborCost),
          fixedCosts: Number(value.fixedCosts),
          profitMargin: Number(value.profitMargin),
        },
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.activeOrder.set(null);
          this.load();
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
      packageQuantity: [item.packageQuantity, Validators.min(0.000001)],
      unit: [item.unit],
      quantityUsed: [item.quantityUsed, Validators.min(0)],
    });
  }

  private syncCostInputs(): void {
    const v = this.calcForm.getRawValue();
    const signature = JSON.stringify([v.items, v.laborCost, v.fixedCosts, v.profitMargin]);
    if (this.costSignature !== signature) this.recommendation.set(null);
    this.costSignature = signature;
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
