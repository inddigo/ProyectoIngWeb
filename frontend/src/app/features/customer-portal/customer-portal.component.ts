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
  general: 'Ej: Necesito 2 repisas de madera para el 2026-12-20, con entrega a domicilio',
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
      <ion-toolbar>
        <ion-title><a class="brand-link" routerLink="/" aria-label="Cotiza, inicio"><span class="brand-word">cotiza<span class="brand-dot" aria-hidden="true">.</span></span><span class="brand-caption">Ideas únicas. Pedidos a tu medida.</span></a></ion-title>
        <ion-buttons slot="end">
          @if (auth.currentUser(); as user) {
            <ion-button [routerLink]="auth.homeFor(user)" [attr.aria-label]="user.role === 'BAKER' ? 'Panel del profesional' : 'Mis pedidos'">
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
      <div class="page-container portal-container">
        <nav class="journey" aria-label="Etapas de tu pedido">
          <span [class.active]="!structured()"><b>01</b> Tu idea</span><i aria-hidden="true"></i>
          <span [class.active]="structured()"><b>02</b> Los detalles</span><i aria-hidden="true"></i>
          <span><b>03</b> Tu cotización</span>
        </nav>
        <ion-grid>
          <ion-row>
            @if (!structured()) {
              <ion-col size="12" sizeLg="5" class="intro-column">
                <span class="eyebrow">Pedidos personalizados, sin enredos</span>
                <h1>Tu idea,<br />lista para <em>cotizar.</em></h1>
                <p class="intro-copy">Cada trabajo a medida empieza con una conversación. Cotiza ordena lo que necesitas, reúne referencias y ayuda al profesional a calcular un precio según sus costos.</p>
                <p class="studio-context">Para quienes crean, diseñan y trabajan por encargo: desde un taller o un estudio hasta un proyecto independiente.</p>
                <img class="idea-illustration" src="/idea-studio.svg" alt="" width="300" height="190" />
                <div class="intro-detail">Tú tienes la última palabra en cada detalle.</div>
              </ion-col>
            }
            <!-- Entrada en lenguaje natural -->
            <ion-col size="12" [sizeLg]="structured() ? '5' : '7'">
              <ion-card class="request-card">
                <ion-card-header>
                  <div class="step-label">01 / TU IDEA</div><ion-card-title>Cuéntanos qué tienes en mente</ion-card-title>
                  <ion-card-subtitle>Describe tu encargo con tus palabras. Revisa los detalles antes de enviarlos al profesional.</ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  <form [formGroup]="requestForm" (ngSubmit)="structure()">
                    <p class="available-domains">Rubros disponibles en esta versión</p>
                    <ion-segment formControlName="domain" aria-label="Rubro de tu pedido">
                      @for (d of domains; track d) {
                        <ion-segment-button [value]="d">
                          <ion-label>{{ domainLabels[d] }}</ion-label>
                        </ion-segment-button>
                      }
                    </ion-segment>

                    <div class="request-fields">
                      <div class="field-block">
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
                      </div>
                      <button type="button" class="example-button" (click)="requestForm.controls.rawText.setValue(placeholder().replace('Ej: ', ''))">¿No sabes por dónde empezar? Usa un ejemplo ↗</button>
                      <div class="field-block">
                        <ion-input
                          formControlName="referenceImage"
                          type="url"
                          inputmode="url"
                          label="URL de imagen de referencia (opcional)"
                          labelPlacement="stacked"
                          fill="outline"
                          placeholder="https://..."
                          errorText="Debe ser una URL HTTPS válida"
                        ></ion-input>
                      </div>
                    </div>

                    <ion-button type="submit" class="primary-action" expand="block" [disabled]="loading()">
                      @if (loading()) {
                        <ion-spinner slot="start" name="dots"></ion-spinner>
                        Organizando tu idea...
                      } @else {
                        <ion-icon slot="start" name="sparkles-outline"></ion-icon>
                        Dar forma a mi pedido
                      }
                    </ion-button>
                    <p class="form-assurance">El profesional recibe tu pedido solo cuando lo confirmas.</p>
                  </form>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <!-- Resultado estructurado y editable -->
            @if (structured(); as data) {
              <ion-col size="12" sizeLg="7">
                <ion-card>
                  <ion-card-header>
                    <div class="step-label">02 / LOS DETALLES</div><ion-card-title>Así empieza a tomar forma</ion-card-title>
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

                    @if (data.extraction_meta?.fallback_used) {
                      <ion-text color="warning">
                        <p>No se pudieron recuperar referencias de la fuente externa. Puedes continuar con tu pedido sin imágenes.</p>
                      </ion-text>
                    }
                    @if (data.web_references.length) {
                      <h3>Referencias visuales encontradas en la Web</h3>
                      @if (data.extraction_meta; as meta) {
                        <p class="muted">
                          <ion-note>
                            Consulta: "{{ meta.query_used }}" · {{ meta.valid_count }} válidas de {{ meta.raw_count }} · {{ meta.returned_count }} mostradas ({{ meta.duplicates_removed }} duplicadas filtradas) · {{ meta.latency_ms }} ms
                            {{ meta.cache_hit ? '· caché TTL' : '' }}
                          </ion-note>
                        </p>
                      }
                      <div class="references">
                        @for (ref of data.web_references; track ref.image_url) {
                          <figure>
                            <img [src]="ref.image_url" [alt]="ref.title" loading="lazy" />
                            <figcaption>
                              {{ ref.title }}<br />
                              <ion-note>{{ ref.source }}</ion-note>
                              <br />
                              <span>{{ ref.creator || 'Autor no informado' }} · {{ ref.license || 'Licencia no informada' }}</span>
                              @if (ref.source_url) {
                                <br /><a [href]="ref.source_url" target="_blank" rel="noopener noreferrer">Ver obra original y condiciones de uso</a>
                              }
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
        <footer class="portal-footer"><strong>De una idea a algo muy tuyo.</strong><span>Describe · Revisa · Cotiza</span></footer>
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

  readonly domains: Domain[] = ['general', 'cake', 'tattoo'];
  readonly domainLabels = DOMAIN_LABELS;

  readonly requestForm = this.fb.group({
    domain: this.fb.control<Domain>('general'),
    rawText: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    referenceImage: ['', Validators.pattern(/^https:\/\/\S+$/)],
  });
  attributesForm = new FormGroup<Record<string, FormControl<string>>>({});

  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly structured = signal<StructuredOrder | null>(null);
  readonly attributeKeys = signal<string[]>([]);
  private readonly selectedDomain = signal<Domain>('general');

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
    if (this.attributesForm.invalid) {
      this.attributesForm.markAllAsTouched();
      this.notify.show('Revisa los campos: cantidades entre 1 y 10000 y textos de hasta 200 caracteres.', 'warning');
      return;
    }

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
          sourceUrl: r.source_url,
          license: r.license,
          creator: r.creator,
          queryUsed: r.query_used,
          retrievedAt: r.retrieved_at,
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
        validators: typeof value === 'number' ? [Validators.required, Validators.min(1), Validators.max(10000), Validators.pattern(/^\d+$/)] : key === 'service_type' ? [Validators.required, Validators.minLength(2), Validators.maxLength(200)] : [Validators.maxLength(200)],
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
