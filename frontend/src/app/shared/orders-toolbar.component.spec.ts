import { TestBed } from '@angular/core/testing';
import { OrdersToolbarComponent } from './orders-toolbar.component';

describe('Selector de filtros', () => {
  it('muestra el estado inicial real aunque las opciones se creen dinámicamente', async () => {
    const fixture = TestBed.createComponent(OrdersToolbarComponent);
    fixture.componentRef.setInput('orders', []);
    fixture.componentRef.setInput('filters', { query: '', domain: 'general', status: 'CONFIRMED_BY_CLIENT' });
    fixture.detectChanges();
    await fixture.whenStable();
    const selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    expect(selects[0].value).toBe('general');
    expect(selects[1].value).toBe('CONFIRMED_BY_CLIENT');
    fixture.componentInstance.reset();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(selects[1].value).toBe('ALL');
  });

  it('propaga el estado seleccionado al filtro que usa la lista', async () => {
    const fixture = TestBed.createComponent(OrdersToolbarComponent);
    fixture.componentRef.setInput('orders', []);
    fixture.componentRef.setInput('filters', { query: '', domain: 'ALL', status: 'ALL' });
    fixture.detectChanges();
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelectorAll('select')[1] as HTMLSelectElement;
    select.value = 'CANCELLED_BY_CLIENT';
    select.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.filters().status).toBe('CANCELLED_BY_CLIENT');
  });
});
