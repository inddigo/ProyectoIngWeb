import { Domain, Order, OrderStatus } from '../core/models/order.model';

export interface OrderFilters {
  query: string;
  domain: Domain | 'ALL';
  status: OrderStatus | 'ALL';
}

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function filterOrders(orders: Order[], filters: OrderFilters): Order[] {
  const terms = normalize(filters.query.trim()).split(/\s+/).filter(Boolean);
  return orders.filter(order => {
    if (filters.domain !== 'ALL' && order.domain !== filters.domain) return false;
    if (filters.status !== 'ALL' && order.status !== filters.status) return false;
    const text = normalize(`${order.id} ${order.rawText} ${JSON.stringify(order.attributes ?? {})}`);
    return terms.every(term => text.includes(term));
  });
}
