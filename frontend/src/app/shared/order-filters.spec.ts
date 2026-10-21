import { Order } from '../core/models/order.model';
import { filterOrders, OrderFilters } from './order-filters';

describe('Filtros de pedidos', () => {
  const orders = [
    { id: 'general-1', domain: 'general', rawText: 'Repisas a medida', status: 'CONFIRMED_BY_CLIENT', attributes: { materials: 'madera' } },
    { id: 'cake-2', domain: 'cake', rawText: 'Torta de cumpleaños', status: 'QUOTED', attributes: {} },
    { id: 'general-3', domain: 'general', rawText: 'Diseño gráfico', status: 'CANCELLED_BY_CLIENT', attributes: {} },
  ] as Order[];
  const all: OrderFilters = { query: '', domain: 'ALL', status: 'ALL' };

  it('combina búsqueda sin tildes con rubro y estado', () => {
    expect(filterOrders(orders, { query: 'repisas madera', domain: 'general', status: 'CONFIRMED_BY_CLIENT' }).map(o => o.id)).toEqual(['general-1']);
    expect(filterOrders(orders, { ...all, query: 'diseno grafico' }).map(o => o.id)).toEqual(['general-3']);
  });
  it('permite buscar por número y mostrar cancelados', () => {
    expect(filterOrders(orders, { ...all, query: 'cake-2' }).map(o => o.id)).toEqual(['cake-2']);
    expect(filterOrders(orders, { ...all, status: 'CANCELLED_BY_CLIENT' }).map(o => o.id)).toEqual(['general-3']);
  });
  it('restablece todos los pedidos y no mezcla filtros incompatibles', () => {
    expect(filterOrders(orders, all)).toEqual(orders);
    expect(filterOrders(orders, { ...all, domain: 'cake', status: 'CANCELLED_BY_CLIENT' })).toEqual([]);
  });
});
