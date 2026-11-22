import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { BakerDashboardComponent } from './baker-dashboard.component';
import { Order } from '../../core/models/order.model';
import { Recommendation } from '../../core/models/recommendation.model';

describe('Calculadora con historial', () => {
  let component: BakerDashboardComponent;
  let http: HttpTestingController;
  const order: Order = { id: 'local-order', domain: 'general', rawText: 'Dos repisas', attributes: { service_type: 'Carpintería', quantity: 2 }, status: 'CONFIRMED_BY_CLIENT', webReferences: [], createdAt: '2026-10-21' };
  const result: Recommendation = { id: 'recommendation-1', version: 'cost-history-v1', mode: 'adaptive', adapted: true, suggestedTotal: 15960, baselineTotal: 15600, totalCost: 12000, appliedMargin: 33, sampleCount: 3, decisionCount: 3, acceptanceRate: 1, referenceCount: 0, reasons: ['Tres comparables'], warnings: [] };
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BakerDashboardComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideIonicAngular()] }).compileComponents();
    const fixture = TestBed.createComponent(BakerDashboardComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    component.ngOnInit();
    http.expectOne(r => r.url.endsWith('/orders')).flush([]);
    component.openCalculator(order);
    component.calcForm.patchValue({ laborCost: 10000, fixedCosts: 2000 });
  });
  afterEach(() => http.verify());
  it('aplica el perfil por horas y mantiene el precio editable', () => {
    component.profile.set({ hourlyRate: 6000, fixedCosts: 2000, profitMargin: 30, useHistory: true });
    component.calcForm.controls.hours.setValue(2);
    component.applyProfile();
    expect(component.calcForm.controls.laborCost.value).toBe(12000);
    expect(component.calcForm.controls.finalPrice.value).toBe(18200);
    component.calcForm.controls.finalPrice.setValue(20000);
    expect(component.calcForm.controls.finalPrice.value).toBe(20000);
  });
  it('no usa una respuesta atrasada si cambiaron los costos', () => {
    component.recommend('adaptive');
    const request = http.expectOne(r => r.url.endsWith('/recommend/local-order'));
    component.calcForm.controls.laborCost.setValue(20000);
    request.flush(result);
    expect(component.recommendation()).toBeNull();
  });
  it('aplica la recomendación y la invalida cuando cambian los insumos', () => {
    component.recommend('adaptive');
    http.expectOne(r => r.url.endsWith('/recommend/local-order')).flush(result);
    component.applyRecommendation();
    expect(component.calcForm.controls.finalPrice.value).toBe(15960);
    expect(component.recommendation()?.id).toBe('recommendation-1');
    component.itemsArray.at(0).patchValue({ packageCost: 5000 });
    expect(component.recommendation()).toBeNull();
  });
  it('no adjunta totales calculados por el navegador como costos confiables', () => {
    component.useSuggested();
    component.submitQuote();
    const request = http.expectOne(r => r.url.endsWith('/quotes'));
    expect(request.request.body.breakdown.totalCost).toBeUndefined();
    expect(request.request.body.breakdown.items).toBeDefined();
    request.flush({ id: 'quote-1' });
    http.expectOne(r => r.url.endsWith('/orders')).flush([]);
  });
});
