import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="max-width: 400px; margin: 4rem auto; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-family: sans-serif;">
      <h2 style="text-align: center; color: #d81b60; margin-bottom: 1.5rem;">Iniciar Sesión</h2>
      
      <div *ngIf="error()" style="color: white; background: #e53935; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; text-align: center;">
        {{ error() }}
      </div>

      <form (ngSubmit)="onSubmit()" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="display: block; font-weight: bold; margin-bottom: 0.5rem;">Email</label>
          <input type="email" [(ngModel)]="email" name="email" required style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box;">
        </div>
        
        <div>
          <label style="display: block; font-weight: bold; margin-bottom: 0.5rem;">Contraseña</label>
          <input type="password" [(ngModel)]="password" name="password" required style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box;">
        </div>

        <button type="submit" [disabled]="loading()" style="margin-top: 1rem; background: #d81b60; color: white; border: none; padding: 1rem; border-radius: 6px; font-weight: bold; cursor: pointer;">
          {{ loading() ? 'Entrando...' : 'Ingresar' }}
        </button>
      </form>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.loading.set(true);
    this.error.set(null);

    // TODO: Connect with real NestJS Auth endpoint
    // For now, simulate a successful login for a BAKER
    setTimeout(() => {
      if (this.email && this.password) {
        this.authService.setSession('fake-jwt-token', {
          id: '1',
          email: this.email,
          name: 'Pastelero Principal',
          role: 'BAKER'
        });
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set('Por favor ingresa email y contraseña');
      }
      this.loading.set(false);
    }, 1000);
  }
}
