import { Component, inject, input, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { apiErrorMessage } from '../../core/interceptors/error.interceptor';
import { AuthResponse } from '../../core/models/user.model';

type Mode = 'login' | 'register';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonSpinner,
    IonText,
  ],
  styles: `
    .auth-wrapper {
      max-width: 460px;
      margin: 0 auto;
    }
    @media (min-width: 768px) {
      .auth-wrapper {
        margin-top: 48px;
      }
    }
  `,
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ mode() === 'login' ? 'Iniciar sesión' : 'Crear cuenta' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="auth-wrapper">
        <ion-segment [value]="mode()" (ionChange)="setMode($any($event.detail.value))">
          <ion-segment-button value="login"><ion-label>Ingresar</ion-label></ion-segment-button>
          <ion-segment-button value="register"><ion-label>Registrarse</ion-label></ion-segment-button>
        </ion-segment>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ mode() === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta' }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            @if (error()) {
              <ion-text color="danger"><p role="alert">{{ error() }}</p></ion-text>
            }

            <form [formGroup]="form" (ngSubmit)="submit()">
              <ion-list lines="none">
                @if (mode() === 'register') {
                  <ion-item>
                    <ion-segment formControlName="role" aria-label="Tipo de cuenta">
                      <ion-segment-button value="CLIENT"><ion-label>Soy cliente</ion-label></ion-segment-button>
                      <ion-segment-button value="BAKER"><ion-label>Soy profesional</ion-label></ion-segment-button>
                    </ion-segment>
                  </ion-item>
                  <ion-item>
                    <ion-input
                      formControlName="name"
                      label="Nombre"
                      labelPlacement="stacked"
                      fill="outline"
                      autocomplete="name"
                      errorText="Ingresa tu nombre (mínimo 2 caracteres)"
                    ></ion-input>
                  </ion-item>
                }
                <ion-item>
                  <ion-input
                    formControlName="email"
                    type="email"
                    inputmode="email"
                    label="Email"
                    labelPlacement="stacked"
                    fill="outline"
                    autocomplete="email"
                    errorText="Ingresa un email válido"
                  ></ion-input>
                </ion-item>
                <ion-item>
                  <ion-input
                    formControlName="password"
                    type="password"
                    label="Contraseña"
                    labelPlacement="stacked"
                    fill="outline"
                    [autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'"
                    [errorText]="mode() === 'login' ? 'Ingresa tu contraseña' : 'Mínimo 8 caracteres'"
                  ></ion-input>
                </ion-item>
              </ion-list>

              <ion-button type="submit" expand="block" [disabled]="loading()">
                @if (loading()) {
                  <ion-spinner slot="start" name="dots"></ion-spinner>
                }
                {{ mode() === 'login' ? 'Ingresar' : 'Crear cuenta' }}
              </ion-button>
            </form>
          </ion-card-content>
        </ion-card>

        <ion-button fill="clear" expand="block" routerLink="/">Volver al portal del cliente</ion-button>
      </div>
    </ion-content>
  `,
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  /** Ruta a la que volver después de autenticarse (query param). */
  readonly returnUrl = input<string>();

  readonly mode = signal<Mode>('login');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    role: this.fb.control<'CLIENT' | 'BAKER'>('CLIENT'),
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  setMode(mode: Mode): void {
    this.mode.set(mode);
    this.error.set(null);
    const { name, password } = this.form.controls;
    if (mode === 'register') {
      name.setValidators([Validators.required, Validators.minLength(2)]);
      password.setValidators([Validators.required, Validators.minLength(8)]);
    } else {
      name.clearValidators();
      password.setValidators([Validators.required]);
    }
    name.updateValueAndValidity();
    password.updateValueAndValidity();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password, name, role } = this.form.getRawValue();
    const request$: Observable<AuthResponse> =
      this.mode() === 'login'
        ? this.auth.login(email, password)
        : this.auth.register({ email, password, name, role });

    this.loading.set(true);
    this.error.set(null);
    request$.subscribe({
      next: (res) => {
        this.loading.set(false);
        this.notify.show(`Hola, ${res.user.name}`, 'success');
        const target =
          res.user.role === 'CLIENT' && this.returnUrl()
            ? this.returnUrl()!
            : this.auth.homeFor(res.user);
        this.router.navigateByUrl(target);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err.status === 401
            ? 'Email o contraseña incorrectos'
            : apiErrorMessage(err, 'No se pudo completar la operación'),
        );
      },
    });
  }
}
