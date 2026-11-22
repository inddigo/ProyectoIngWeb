import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertController, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { apiErrorMessage } from '../../core/interceptors/error.interceptor';

@Component({
  selector: 'app-account',
  imports: [ReactiveFormsModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonInput],
  styles: `.account {max-width:720px;margin:0 auto;padding:24px;} section {padding:24px 0;border-bottom:1px solid var(--ion-color-light-shade);} p{line-height:1.7;} .error{color:var(--ion-color-danger);} form{display:grid;gap:16px;}`,
  template: `
    <ion-header><ion-toolbar color="primary"><ion-title>Mi cuenta y privacidad</ion-title><ion-buttons slot="end"><ion-button [routerLink]="auth.homeFor()">Volver a mis pedidos</ion-button></ion-buttons></ion-toolbar></ion-header>
    <ion-content><main class="account">
      <h1>Tus datos, bajo tu control.</h1>
      <p>Guardamos tu nombre, correo, pedidos y cotizaciones para gestionar tus encargos. Las contraseñas se almacenan mediante hash. Las consultas a Openverse usan términos de un catálogo; no enviamos tu mensaje completo ni tus datos de contacto.</p>
      <section><h2>Datos de la cuenta</h2><p>{{ auth.currentUser()?.email }}</p>
        <form [formGroup]="form" (ngSubmit)="save()"><ion-input formControlName="name" label="Nombre" labelPlacement="stacked" fill="outline" maxlength="100" /><ion-button type="submit" [disabled]="busy() || form.invalid">Guardar nombre</ion-button></form>
      </section>
      <section><h2>Consultar mis datos</h2><p>Puedes descargar una copia de la información de tu cuenta. Incluye tus pedidos, cotizaciones y recomendaciones guardadas; no incluye contraseñas ni tokens.</p><ion-button fill="outline" [disabled]="busy()" (click)="download()">Descargar mis datos (JSON)</ion-button></section>
      <section><h2>Eliminar mi cuenta</h2><p>Se eliminarán tu cuenta, tus pedidos como cliente y sus referencias y cotizaciones. Si eres profesional, tus cotizaciones a otros clientes permanecerán en sus pedidos sin vincularse a tu cuenta. Se eliminarán tu perfil y tus recomendaciones. Esta acción no se puede deshacer.</p>
        <ion-input [formControl]="password" type="password" autocomplete="current-password" label="Confirma tu contraseña" labelPlacement="stacked" fill="outline" />
        <ion-button color="danger" fill="outline" [disabled]="busy() || !password.value" (click)="remove()">Eliminar mi cuenta</ion-button>
      </section>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    </main></ion-content>
  `,
})
export class AccountComponent {
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = `${environment.apiUrl}/auth/account`;
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = this.fb.group({ name: [this.auth.currentUser()?.name ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]] });
  readonly password = this.fb.control('');
  save() {
    if (this.busy() || this.form.invalid) return;
    this.busy.set(true); this.error.set('');
    this.http.patch<{name: string}>(this.api, this.form.getRawValue()).subscribe({ next: user => { this.busy.set(false); this.auth.updateName(user.name); this.notify.show('Nombre actualizado', 'success'); }, error: e => this.failed(e) });
  }
  download() {
    this.busy.set(true); this.error.set('');
    this.http.get(this.api).subscribe({ next: data => {
      this.busy.set(false);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'mis-datos-cotiza.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }, error: e => this.failed(e) });
  }
  async remove() {
    if (this.busy() || !this.password.value) return;
    const alert = await this.alerts.create({ header: '¿Eliminar tu cuenta y tus pedidos?', message: 'Se borrarán los datos indicados en esta página. Esta acción es definitiva.', buttons: [{ text: 'Conservar mi cuenta', role: 'cancel' }, { text: 'Eliminar definitivamente', handler: () => {
      this.busy.set(true); this.error.set('');
      this.http.delete(this.api, { body: { password: this.password.value } }).subscribe({ next: () => { this.password.reset(); this.auth.logout(); this.router.navigate(['/']); this.notify.show('Cuenta eliminada', 'success'); }, error: e => this.failed(e) });
    } }] }); await alert.present();
  }
  private failed(e: unknown) { this.busy.set(false); this.error.set(apiErrorMessage(e, 'No se pudo completar la operación')); }
}
