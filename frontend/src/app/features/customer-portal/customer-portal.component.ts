import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-customer-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div style="font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem;">
      <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 2px solid #f0f0f0; padding-bottom: 1rem;">
        <h1 style="color: #d81b60; margin: 0;">🍰 Pastelería Personalizada</h1>
        <button (click)="goToLogin()" style="background: transparent; border: 1px solid #d81b60; color: #d81b60; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">Acceso Pastelero</button>
      </header>

      <!-- PORTAL CLIENTE: ENTRADA DE LENGUAJE NATURAL -->
      <section style="background: #fff5f8; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; border: 1px solid #f8bbd0;">
        <h2 style="font-size: 1.25rem; color: #880e4f; margin-top: 0;">Describe tu Torta Ideal</h2>
        <textarea 
          [(ngModel)]="userInput" 
          placeholder="Ej: Quiero una torta para 20 personas, vegana, temática de superhéroes y de sabor chocolate con manjar..."
          style="width: 100%; height: 100px; padding: 0.75rem; border-radius: 8px; border: 1px solid #ccc; font-size: 1rem; box-sizing: border-box;"
        ></textarea>
        <button 
          (click)="processNLP()" 
          [disabled]="loading()"
          style="margin-top: 1rem; background: #d81b60; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-size: 1rem; cursor: pointer;"
        >
          {{ loading() ? 'Procesando con IA...' : 'Estructurar Pedido Adaptativo' }}
        </button>
      </section>

      <!-- DECISIÓN VERIFICABLE: FORMULARIO ADAPTATIVO GENERADO -->
      <section *ngIf="structuredData()" style="background: #ffffff; padding: 1.5rem; border-radius: 12px; border: 1px solid #ddd; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="font-size: 1.25rem; color: #333; margin: 0;">Confirmación y Decisión Verificable</h2>
          <span style="background: #e8f5e9; color: #2e7d32; padding: 0.25rem 0.75rem; border-radius: 16px; font-size: 0.875rem; font-weight: bold;">
            Confianza IA: {{ (structuredData()?.entities?.confidence_score || 0) * 100 }}%
          </span>
        </div>
        <p style="color: #666; font-size: 0.9rem;">Por favor, revisa y modifica la estructuración propuesta por el motor adaptativo antes de enviar al pastelero:</p>

        <form style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 0.5rem;">Cantidad de Porciones:</label>
            <input type="number" [(ngModel)]="structuredData().entities.servings" name="servings" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #ccc;">
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 0.5rem;">Temática Extraída:</label>
            <input type="text" [(ngModel)]="structuredData().entities.theme" name="theme" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #ccc;">
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 0.5rem;">Restricciones Alimentarias:</label>
            <input type="text" [value]="structuredData().entities.dietary_restrictions.join(', ')" readonly style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #eee; background: #fafafa;">
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 0.5rem;">Sabores Identificados:</label>
            <input type="text" [value]="structuredData().entities.flavors.join(', ')" readonly style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #eee; background: #fafafa;">
          </div>
        </form>

        <!-- OBTENCIÓN DE INFORMACIÓN WEB -->
        <div style="margin-top: 1.5rem;" *ngIf="structuredData().web_references.length > 0">
          <h3 style="font-size: 1rem; color: #444;">Imágenes de Referencia Obtenidas de la Web:</h3>
          <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem;">
            <div *ngFor="let ref of structuredData().web_references" style="min-width: 200px; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
              <img [src]="ref.image_url" [alt]="ref.title" style="width: 100%; height: 120px; object-fit: cover;">
              <p style="padding: 0.5rem; margin: 0; font-size: 0.8rem; color: #555;">{{ ref.title }} <br><small style="color: #999;">Fuente: {{ ref.source }}</small></p>
            </div>
          </div>
        </div>

        <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
          <button (click)="confirmOrder()" style="background: #2e7d32; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer;">
            Confirmar y Enviar al Pastelero
          </button>
          <button (click)="resetForm()" style="background: #757575; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer;">
            Rechazar y Reiniciar
          </button>
        </div>
      </section>

      <!-- MENSAJE DE ÉXITO -->
      <div *ngIf="orderConfirmed()" style="background: #e8f5e9; color: #1b5e20; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #a5d6a7;">
        ✓ ¡Solicitud estandarizada enviada exitosamente al Portal del Pastelero!
      </div>
    </div>
  `
})
export class CustomerPortalComponent {
  userInput = 'Quiero una torta para 20 personas, vegana, temática de superhéroes y sabor chocolate con manjar';
  loading = signal(false);
  structuredData = signal<any>(null);
  orderConfirmed = signal(false);

  constructor(private http: HttpClient, private router: Router) {}

  processNLP() {
    this.loading.set(true);
    this.orderConfirmed.set(false);

    this.http.post<any>('http://localhost:3000/api/v1/orders/nlp-structure', { rawText: this.userInput })
      .subscribe({
        next: (res) => {
          this.structuredData.set(res);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      });
  }

  confirmOrder() {
    this.orderConfirmed.set(true);
    this.structuredData.set(null);
  }

  resetForm() {
    this.structuredData.set(null);
    this.orderConfirmed.set(false);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
