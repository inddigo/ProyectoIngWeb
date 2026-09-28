import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PercentPipe } from '@angular/common';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonNote,
  IonRow,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSpinner,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  sparklesOutline,
  sendOutline,
  refreshOutline,
  personCircleOutline,
  listOutline,
  logOutOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { OrderDraftService } from '../../core/services/order-draft.service';
import { NotificationService } from '../../core/services/notification.service';
import { apiErrorMessage } from '../../core/interceptors/error.interceptor';
import {
  Attributes,
  Domain,
  DOMAIN_LABELS,
  StructuredOrder,
} from '../../core/models/order.model';
import {
  attributeEntries,
  attributeLabel,
  formatAttribute,
  parseAttribute,
} from '../../shared/attributes';

const PLACEHOLDERS: Record<Domain, string> = {
  cake: 'Ej: Quiero una torta vegana de chocolate para 20 personas con temática de Batman',
  tattoo: 'Ej: Quiero un tatuaje de 15 cm en el antebrazo a color',
};

@Component({
  selector: 'app-customer-portal',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PercentPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonTextarea,
    IonInput,
    IonItem,
    IonList,
    IonNote,
    IonBadge,
    IonSpinner,
    IonText,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Cotiza · Pedidos personalizados</ion-title>
        <ion-buttons slot="end">
          @if (auth.currentUser(); as user) {
            <ion-button [routerLink]="auth.homeFor(user)">
              <ion-icon slot="start" name="list-outline"></ion-icon>
              <span class="ion-hide-sm-down">{{ user.role === 'BAKER' ? 'Panel' : 'Mis pedidos' }}</span>
            </ion-button>
            <ion-button (click)="logout()" aria-label="Cerrar sesión">
              <ion-icon slot="icon-only" name="log-out-outline"></ion-icon>
            </ion-button>
          } @else {
            <ion-button routerLink="/login">
              <ion-icon slot="start" name="person-circle-outline"></ion-icon>
              Ingresar
            </ion-button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="page-container">
        <ion-grid>
          <ion-row>
            <!-- Entrada en lenguaje natural -->
            <ion-col size="12" [sizeLg]="structured() ? '5' : '12'">
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Describe lo que necesitas</ion-card-title>
                  <ion-card-subtitle>La IA convertirá tu mensaje en un formulario estructurado</ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  <form [formGroup]="requestForm" (ngSubmit)="structure()">
                    <ion-segment formControlName="domain" aria-label="Tipo de servicio">
                      @for (d of domains; track d) {
                        <ion-segment-button [value]="d">
                          <ion-label>{{ domainLabels[d] }}</ion-label>
                        </ion-segment-button>
                      }
                    </ion-segment>

                    <ion-list lines="none" class="ion-margin-top">
                      <ion-item>
                        <ion-textarea
                          formControlName="rawText"
                          label="Tu pedido"
                          labelPlacement="stacked"
                          fill="outline"
                          [autoGrow]="true"
                          [rows]="4"
                          [counter]="true"
                          [maxlength]="2000"
                          [placeholder]="placeholder()"
                          errorText="Describe tu pedido con al menos 10 caracteres"
                        ></ion-textarea>
                      </ion-item>
                      <ion-item>
                        <ion-input
                          formControlName="referenceImage"
                          type="url"
                          inputmode="url"
                          label="URL de imagen de referencia (opcional)"
                          labelPlacement="stacked"
                          fill="outline"
                          placeholder="https://..."
                          errorText="Debe ser una URL que empiece con http:// o https://"
                        ></ion-input>
                      </ion-item>
                    </ion-list>

                    <ion-button type="submit" expand="block" [disabled]="loading()">
                      @if (loading()) {
                        <ion-spinner slot="start" name="dots"></ion-spinner>
                        Procesando con IA...
                      } @else {
                        <ion-icon slot="start" name="sparkles-outline"></ion-icon>
                        Estructurar pedido
                      }
                    </ion-button>
                  </form>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <!-- Resultado estructurado y editable -->
            @if (structured(); as data) {
              <ion-col size="12" sizeLg="7">
                <ion-card>
                  <ion-card-header>
                    <ion-card-title>Revisa los datos extraídos</ion-card-title>
                    <ion-card-subtitle>
                      Confianza de la IA:
                      <ion-badge [color]="confidenceColor()">{{ confidence() | percent }}</ion-badge>
                    </ion-card-subtitle>
                  </ion-card-header>
                  <ion-card-content>
                    @if (data.fallback) {
                      <ion-text color="warning">
                        <p>El motor de IA no está disponible ahora. Completa los datos manualmente.</p>
                      </ion-text>
                    } @else if (confidence() < 0.6) {
                      <ion-text color="warning">
                        <p>Faltan detalles en tu mensaje; corrige o completa los campos antes de enviar.</p>
                      </ion-text>
                    }

                    <form [formGroup]="attributesForm">
                      <ion-list lines="none">
                        @for (key of attributeKeys(); track key) {
                          <ion-item>
                            <ion-input
                              [formControlName]="key"
                              [label]="label(key)"
                              labelPlacement="stacked"
                              fill="outline"
                            ></ion-input>
                          </ion-item>
                        }
                      </ion-list>
                    </form>

                    @if (data.web_references.length) {
                      <h3>Referencias visuales encontradas en la Web</h3>
                      <div class="references">
                        @for (ref of data.web_references; track ref.image_url) {
                          <figure>
                            <img [src]="ref.image_url" [alt]="ref.title" loading="lazy" />
                            <figcaption>
                              {{ ref.title }}<br />
                              <ion-note>{{ ref.source }}</ion-note>
                            </figcaption>
                          </figure>
                        }
                      </div>
                    }

                    <ion-row class="ion-margin-top">
                      <ion-col size="12" sizeMd="8">
                        <ion-button expand="block" color="success" (click)="confirm()" [disabled]="sending()">
                          <ion-icon slot="start" name="send-outline"></ion-icon>
                          {{ sending() ? 'Enviando...' : 'Confirmar y enviar al profesional' }}
                        </ion-button>
                      </ion-col>
                      <ion-col size="12" sizeMd="4">
                        <ion-button expand="block" fill="outline" color="medium" (click)="reset()">
                          <ion-icon slot="start" name="refresh-outline"></ion-icon>
                          Reiniciar
                        </ion-button>
                      </ion-col>
                    </ion-row>
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
export class CustomerPortalComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly orders = inject(OrderService);
  private readonly drafts = inject(OrderDraftService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly domains: Domain[] = ['cake', 'tattoo'];
  readonly domainLabels = DOMAIN_LABELS;

  readonly requestForm = this.fb.group({
    domain: this.fb.control<Domain>('cake'),
    rawText: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    referenceImage: ['', Validators.pattern(/^https?:\/\/\S+$/)],
  });
  attributesForm = new FormGroup<Record<string, FormControl<string>>>({});

  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly structured = signal<StructuredOrder | null>(null);
  readonly attributeKeys = signal<string[]>([]);
  private readonly selectedDomain = signal<Domain>('cake');

  readonly placeholder = computed(() => PLACEHOLDERS[this.selectedDomain()]);
  readonly confidence = computed(
    () => this.structured()?.entities.confidence_score ?? 0,
  );
  readonly confidenceColor = computed(() => {
    const c = this.confidence();
    return c >= 0.8 ? 'success' : c >= 0.6 ? 'warning' : 'danger';
  });

  readonly label = attributeLabel;

  ngOnInit(): void {
    this.requestForm.controls.domain.valueChanges.subscribe((d) =>
      this.selectedDomain.set(d),
    );
    // Restaurar el pedido si el cliente tuvo que iniciar sesión antes de enviarlo
    const draft = this.drafts.draft();
    if (draft) {
      this.requestForm.patchValue(draft);
      this.selectedDomain.set(draft.domain);
      if (draft.structured) {
        this.setStructured(draft.structured);
      }
    }
  }

  structure(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }
    const { rawText, domain } = this.requestForm.getRawValue();
    this.loading.set(true);
    this.orders.structureOrder(rawText, domain).subscribe({
      next: (res) => {
        this.setStructured(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.show(apiErrorMessage(err, 'No se pudo procesar el pedido'), 'danger');
      },
    });
  }

  confirm(): void {
    const data = this.structured();
    if (!data) return;

    if (!this.auth.hasRole('CLIENT')) {
      if (this.auth.hasRole('BAKER')) {
        this.notify.show('Los profesionales no pueden crear pedidos. Ingresa con una cuenta de cliente.', 'warning');
        return;
      }
      this.drafts.save({ ...this.requestForm.getRawValue(), structured: this.withEditedAttributes(data) });
      this.notify.show('Inicia sesión o crea una cuenta de cliente para enviar tu pedido.', 'medium');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } });
      return;
    }

    const edited = this.withEditedAttributes(data);
    const { confidence_score, ...attributes } = edited.entities;
    const referenceImage = this.requestForm.controls.referenceImage.value.trim();

    this.sending.set(true);
    this.orders
      .createOrder({
        rawText: data.raw_text,
        domain: data.domain,
        attributes: attributes as Attributes,
        confidenceScore: confidence_score,
        imageUrl: referenceImage || undefined,
        webReferences: data.web_references.map((r) => ({
          title: r.title,
          imageUrl: r.image_url,
          source: r.source,
        })),
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.reset();
          this.notify.show('¡Pedido enviado! Puedes seguirlo en "Mis pedidos".', 'success');
          this.router.navigate(['/mis-pedidos']);
        },
        error: (err) => {
          this.sending.set(false);
          this.notify.show(apiErrorMessage(err, 'No se pudo enviar el pedido'), 'danger');
        },
      });
  }

  reset(): void {
    this.structured.set(null);
    this.attributeKeys.set([]);
    this.attributesForm = new FormGroup<Record<string, FormControl<string>>>({});
    this.requestForm.reset({ domain: this.requestForm.controls.domain.value });
    this.drafts.clear();
  }

  logout(): void {
    this.auth.logout();
    this.notify.show('Sesión cerrada');
  }

  private setStructured(data: StructuredOrder): void {
    const entries = attributeEntries(data.entities);
    const controls: Record<string, FormControl<string>> = {};
    for (const [key, value] of entries) {
      controls[key] = new FormControl(formatAttribute(value).replace(/^—$/, ''), {
        nonNullable: true,
      });
    }
    this.attributesForm = new FormGroup(controls);
    this.attributeKeys.set(entries.map(([k]) => k));
    this.structured.set(data);
  }

  /** Aplica las correcciones del cliente conservando los tipos originales. */
  private withEditedAttributes(data: StructuredOrder): StructuredOrder {
    const entities = { ...data.entities };
    for (const key of this.attributeKeys()) {
      const control = this.attributesForm.controls[key];
      if (control) {
        entities[key] = parseAttribute(data.entities[key], control.value);
      }
    }
    return { ...data, entities };
  }
}

addIcons({
  sparklesOutline,
  sendOutline,
  refreshOutline,
  personCircleOutline,
  listOutline,
  logOutOutline,
});
