import { Component, inject, OnInit, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertController, IonButton, IonCheckbox, IonInput } from '@ionic/angular/standalone';
import { ProfessionalProfile } from '../core/models/recommendation.model';
import { RecommendationService } from '../core/services/recommendation.service';
import { NotificationService } from '../core/services/notification.service';
import { apiErrorMessage } from '../core/interceptors/error.interceptor';

@Component({
  selector: 'app-professional-settings',
  imports: [ReactiveFormsModule, IonButton, IonCheckbox, IonInput],
  styles: `details { background:var(--ion-card-background,#fff); border:1px solid var(--ion-color-light-shade); border-radius:16px; padding:20px; margin-bottom:24px; } summary { cursor:pointer; font-weight:650; } form {display:grid; gap:16px; margin-top:18px;} .fields {display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;} p{line-height:1.6}`,
  template: `
    <details>
      <summary>Mi perfil de costos y recomendaciones</summary>
      @if (error()) { <p role="alert">{{ error() }}</p><ion-button fill="outline" (click)="load()">Reintentar</ion-button> }
      @if (ready()) {
        <form [formGroup]="form" (ngSubmit)="save()">
          <p>Configura tus valores en pesos chilenos. Puedes aplicarlos en la calculadora y cambiarlos en cada trabajo.</p>
          <div class="fields">
            <ion-input formControlName="hourlyRate" type="number" label="Valor de tu hora ($)" labelPlacement="stacked" fill="outline" />
            <ion-input formControlName="fixedCosts" type="number" label="Costos fijos por trabajo ($)" labelPlacement="stacked" fill="outline" />
            <ion-input formControlName="profitMargin" type="number" label="Recargo sobre costos (%)" labelPlacement="stacked" fill="outline" />
          </div>
          <ion-checkbox formControlName="useHistory" labelPlacement="end">Usar mis cotizaciones anteriores para orientar recomendaciones</ion-checkbox>
          <p class="muted">Solo se consideran tus trabajos de los últimos 180 días, del mismo rubro y con atributos comparables. Se necesitan tres aceptados. Puedes desactivar el uso del historial o desvincularlo sin eliminar los pedidos del cliente.</p>
          <div><ion-button type="submit" [disabled]="saving() || form.invalid">{{ saving() ? 'Guardando…' : 'Guardar perfil' }}</ion-button>
          <ion-button fill="clear" color="danger" [disabled]="saving()" (click)="clear()">Desvincular mi historial</ion-button></div>
        </form>
      } @else if (!error()) { <p role="status">Cargando perfil…</p> }
    </details>
  `,
})
export class ProfessionalSettingsComponent implements OnInit {
  private readonly api = inject(RecommendationService);
  private readonly notify = inject(NotificationService);
  private readonly alerts = inject(AlertController);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly profileChange = output<ProfessionalProfile>();
  readonly ready = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly form = this.fb.group({ hourlyRate: [0, [Validators.min(0), Validators.max(99999999)]], fixedCosts: [0, [Validators.min(0), Validators.max(99999999)]], profitMargin: [30, [Validators.min(0), Validators.max(500)]], useHistory: [false] });
  ngOnInit() { this.load(); }
  load() {
    this.error.set('');
    this.api.profile().subscribe({ next: p => { this.form.patchValue(p); this.ready.set(true); this.profileChange.emit(p); }, error: e => this.error.set(apiErrorMessage(e, 'No se pudo cargar el perfil')) });
  }
  save() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.api.save(this.form.getRawValue()).subscribe({ next: p => { this.saving.set(false); this.profileChange.emit(p); this.notify.show('Perfil actualizado', 'success'); }, error: e => { this.saving.set(false); this.notify.show(apiErrorMessage(e, 'No se pudo guardar el perfil'), 'danger'); } });
  }
  async clear() {
    const alert = await this.alerts.create({ header: 'Desvincular historial', message: 'Tus cotizaciones anteriores dejarán de alimentar las recomendaciones. Los pedidos y precios enviados se conservan. Esta desvinculación no se puede deshacer.', buttons: [{ text: 'Volver', role: 'cancel' }, { text: 'Desvincular', handler: () => {
      this.saving.set(true);
      this.api.clearHistory().subscribe({ next: () => { this.saving.set(false); this.load(); this.notify.show('Historial desvinculado', 'success'); }, error: e => { this.saving.set(false); this.notify.show(apiErrorMessage(e, 'No se pudo desvincular el historial'), 'danger'); } });
    } }] });
    await alert.present();
  }
}
