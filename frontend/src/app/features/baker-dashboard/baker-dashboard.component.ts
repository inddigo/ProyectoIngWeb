import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

interface Order {
  id: string;
  status: string;
  theme: string;
  servings: number;
  flavors: string[];
  dietaryRestrictions: string[];
}

@Component({
  selector: 'app-baker-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="font-family: system-ui, sans-serif; max-width: 1000px; margin: 0 auto; padding: 2rem;">
      <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 2rem;">
        <h1 style="color: #4a148c; margin: 0;">👨‍🍳 Portal del Pastelero</h1>
        <button (click)="logout()" style="background: #e0e0e0; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">Cerrar Sesión</button>
      </header>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
        
        <!-- Tarjeta de Pedido -->
        <div *ngFor="let order of orders()" style="border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); background: white;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
            <span style="font-weight: bold; color: #333;">Pedido #{{ order.id }}</span>
            <span style="background: #e3f2fd; color: #1565c0; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">
              {{ order.status }}
            </span>
          </div>
          
          <ul style="list-style: none; padding: 0; margin: 0 0 1.5rem 0; color: #555; font-size: 0.9rem;">
            <li style="margin-bottom: 0.5rem;"><strong>Temática:</strong> {{ order.theme }}</li>
            <li style="margin-bottom: 0.5rem;"><strong>Porciones:</strong> {{ order.servings }}</li>
            <li style="margin-bottom: 0.5rem;"><strong>Sabores:</strong> {{ order.flavors.join(', ') }}</li>
            <li *ngIf="order.dietaryRestrictions.length" style="color: #d32f2f;">
              <strong>⚠️ Restricciones:</strong> {{ order.dietaryRestrictions.join(', ') }}
            </li>
          </ul>

          <button *ngIf="activeQuoteOrderId() !== order.id" (click)="openQuoteCalculator(order)" style="width: 100%; background: #4a148c; color: white; border: none; padding: 0.75rem; border-radius: 6px; font-weight: bold; cursor: pointer;">
            Calcular Cotización
          </button>

          <!-- Calculadora Expandible -->
          <div *ngIf="activeQuoteOrderId() === order.id" style="margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem;">
            <h4 style="margin: 0 0 1rem 0; color: #333;">Calculadora de Costos</h4>
            
            <div style="background: #f5f5f5; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem;">
               <p style="margin:0 0 0.5rem 0; display:flex; justify-content: space-between;">
                 <span>Costo Base (x{{order.servings}}):</span>
                 <strong>$ {{ calculatedBaseCost() | number }}</strong>
               </p>
               <p style="margin:0 0 0.5rem 0; display:flex; justify-content: space-between;">
                 <span>Complejidad Temática:</span>
                 <strong>+ $ {{ calculatedThemeCost() | number }}</strong>
               </p>
               <p style="margin:0; display:flex; justify-content: space-between; color: #d32f2f;">
                 <span>Restricciones Especiales:</span>
                 <strong>+ $ {{ calculatedRestrictionsCost() | number }}</strong>
               </p>
               <hr style="border: 0; border-top: 1px solid #ddd; margin: 0.5rem 0;">
               <p style="margin:0; display:flex; justify-content: space-between; font-size: 1.1rem; color: #2e7d32;">
                 <span><strong>Total Sugerido:</strong></span>
                 <strong>$ {{ suggestedTotal() | number }}</strong>
               </p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              <label style="font-weight: bold; font-size: 0.9rem;">Precio Final a Cotizar ($):</label>
              <input type="number" [(ngModel)]="finalPrice" style="padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
              
              <label style="font-weight: bold; font-size: 0.9rem;">Detalles / Notas para el cliente:</label>
              <textarea [(ngModel)]="quoteDetails" rows="2" style="padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;"></textarea>
            </div>

            <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
              <button (click)="submitQuote(order)" style="flex: 1; background: #2e7d32; color: white; border: none; padding: 0.75rem; border-radius: 6px; font-weight: bold; cursor: pointer;">
                Enviar Cotización
              </button>
              <button (click)="cancelQuote()" style="background: #e0e0e0; color: #333; border: none; padding: 0.75rem; border-radius: 6px; cursor: pointer;">
                Cancelar
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class BakerDashboardComponent implements OnInit {
  orders = signal<Order[]>([]);
  
  activeQuoteOrderId = signal<string | null>(null);
  calculatedBaseCost = signal<number>(0);
  calculatedThemeCost = signal<number>(0);
  calculatedRestrictionsCost = signal<number>(0);
  suggestedTotal = signal<number>(0);

  finalPrice = 0;
  quoteDetails = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.orders.set([
      { id: 'ORD-1029', status: 'CONFIRMED_BY_CLIENT', theme: 'Superhéroes', servings: 20, flavors: ['Chocolate', 'Manjar'], dietaryRestrictions: [] },
      { id: 'ORD-1030', status: 'CONFIRMED_BY_CLIENT', theme: 'Boda', servings: 50, flavors: ['Vainilla'], dietaryRestrictions: ['Sin Lactosa', 'Vegana'] }
    ]);
  }

  openQuoteCalculator(order: Order) {
    this.activeQuoteOrderId.set(order.id);
    
    // Simulate HTTP Call to GET /api/v1/quotes/calculate/:orderId
    const base = order.servings * 3000;
    const themeMulti = order.theme === 'Boda' ? 2.0 : (order.theme === 'Superhéroes' ? 1.5 : 1.2);
    const themeC = base * themeMulti - base; // Extra cost
    const restrict = order.dietaryRestrictions.length * 5000;

    this.calculatedBaseCost.set(base);
    this.calculatedThemeCost.set(themeC);
    this.calculatedRestrictionsCost.set(restrict);
    
    const total = base + themeC + restrict;
    this.suggestedTotal.set(total);
    this.finalPrice = total; // Pre-fill with suggestion
    this.quoteDetails = `Cotización estandarizada para pastel de ${order.servings} porciones. Incluye diseño de ${order.theme}.`;
  }

  cancelQuote() {
    this.activeQuoteOrderId.set(null);
  }

  submitQuote(order: Order) {
    // Simulate HTTP Call to POST /api/v1/quotes
    console.log('Cotización enviada:', {
      orderId: order.id,
      estimatedPrice: this.finalPrice,
      details: this.quoteDetails
    });
    
    // Optimistic UI Update
    const updatedOrders = this.orders().filter(o => o.id !== order.id);
    this.orders.set(updatedOrders);
    this.activeQuoteOrderId.set(null);
    alert('Cotización enviada exitosamente al cliente.');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
