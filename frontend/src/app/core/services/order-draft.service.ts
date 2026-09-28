import { Injectable, signal } from '@angular/core';
import { Domain, StructuredOrder } from '../models/order.model';

export interface OrderDraft {
  domain: Domain;
  rawText: string;
  referenceImage: string;
  structured: StructuredOrder | null;
}

/**
 * Conserva en memoria el pedido que el cliente está armando, para no
 * perderlo si debe iniciar sesión antes de enviarlo.
 */
@Injectable({ providedIn: 'root' })
export class OrderDraftService {
  readonly draft = signal<OrderDraft | null>(null);

  save(draft: OrderDraft): void {
    this.draft.set(draft);
  }

  clear(): void {
    this.draft.set(null);
  }
}
