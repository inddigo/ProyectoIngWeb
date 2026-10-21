import { Component, computed, input, model } from '@angular/core';
import { DOMAIN_LABELS, Order, STATUS_LABELS } from '../core/models/order.model';
import { OrderFilters } from './order-filters';

@Component({
  selector: 'app-orders-toolbar',
  template: `
    <section class="order-overview" aria-label="Resumen de pedidos">
      <div><strong>{{ orders().length }}</strong><span>Pedidos</span></div>
      <div><strong>{{ pending() }}</strong><span>Por cotizar</span></div>
      <div><strong>{{ quoted() }}</strong><span>Por decidir</span></div>
      <div><strong>{{ accepted() }}</strong><span>Aceptados</span></div>
    </section>
    <div class="order-filters">
      <label>Buscar pedido<input type="search" maxlength="100" placeholder="Descripción, detalle o número" [value]="filters().query" (input)="change('query', $any($event.target).value)" /></label>
      <label>Rubro<select [value]="filters().domain" (change)="change('domain', $any($event.target).value)">
        <option value="ALL">Todos los rubros</option>
        @for (entry of domains; track entry[0]) { <option [value]="entry[0]">{{ entry[1] }}</option> }
      </select></label>
      <label>Estado<select [value]="filters().status" (change)="change('status', $any($event.target).value)">
        <option value="ALL">Todos los estados</option>
        @for (entry of statuses; track entry[0]) { <option [value]="entry[0]">{{ entry[1] }}</option> }
      </select></label>
      <button type="button" class="filter-reset" (click)="reset()">Limpiar filtros</button>
    </div>
  `,
})
export class OrdersToolbarComponent {
  readonly orders = input.required<Order[]>();
  readonly filters = model.required<OrderFilters>();
  readonly domains = Object.entries(DOMAIN_LABELS);
  readonly statuses = Object.entries(STATUS_LABELS).filter(([key]) => !['DRAFT', 'STRUCTURED'].includes(key));
  readonly pending = computed(() => this.orders().filter(o => o.status === 'CONFIRMED_BY_CLIENT').length);
  readonly quoted = computed(() => this.orders().filter(o => o.status === 'QUOTED').length);
  readonly accepted = computed(() => this.orders().filter(o => o.status === 'ACCEPTED_BY_CLIENT').length);

  change<K extends keyof OrderFilters>(key: K, value: OrderFilters[K]): void {
    this.filters.update(current => ({ ...current, [key]: value }));
  }
  reset(): void { this.filters.set({ query: '', domain: 'ALL', status: 'ALL' }); }
}
