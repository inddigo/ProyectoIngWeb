import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateOrderPayload,
  CreateQuotePayload,
  Domain,
  Order,
  OrderStatus,
  Quote,
  QuoteEstimate,
  StructuredOrder,
} from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/v1`;

  structureOrder(rawText: string, domain: Domain): Observable<StructuredOrder> {
    return this.http.post<StructuredOrder>(`${this.api}/orders/nlp-structure`, {
      rawText,
      domain,
    });
  }

  createOrder(payload: CreateOrderPayload): Observable<Order> {
    return this.http.post<Order>(`${this.api}/orders`, payload);
  }

  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.api}/orders/mine`);
  }

  getOrders(status?: OrderStatus): Observable<Order[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<Order[]>(`${this.api}/orders`, { params });
  }

  decide(
    orderId: string,
    status: 'ACCEPTED_BY_CLIENT' | 'REJECTED_BY_CLIENT',
  ): Observable<Order> {
    return this.http.patch<Order>(`${this.api}/orders/${orderId}/status`, {
      status,
    });
  }

  estimateQuote(orderId: string): Observable<QuoteEstimate> {
    return this.http.get<QuoteEstimate>(
      `${this.api}/quotes/calculate/${orderId}`,
    );
  }

  submitQuote(payload: CreateQuotePayload): Observable<Quote> {
    return this.http.post<Quote>(`${this.api}/quotes`, payload);
  }
}
