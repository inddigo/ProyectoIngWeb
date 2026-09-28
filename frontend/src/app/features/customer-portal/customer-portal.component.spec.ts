import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { CustomerPortalComponent } from './customer-portal.component';

describe('CustomerPortalComponent', () => {
  let fixture: ComponentFixture<CustomerPortalComponent>;
  let component: CustomerPortalComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerPortalComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideIonicAngular()],
    }).compileComponents();
    fixture = TestBed.createComponent(CustomerPortalComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('no envía la solicitud si el texto es demasiado corto', () => {
    component.requestForm.patchValue({ rawText: 'torta' });
    component.structure();
    http.expectNone((r) => r.url.includes('nlp-structure'));
    expect(component.requestForm.controls.rawText.touched).toBeTrue();
  });

  it('muestra los atributos estructurados como campos editables', () => {
    component.requestForm.patchValue({ rawText: 'torta para 20 personas de chocolate', domain: 'cake' });
    component.structure();
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/orders/nlp-structure'));
    expect(req.request.body).toEqual({ rawText: 'torta para 20 personas de chocolate', domain: 'cake' });
    req.flush({
      raw_text: 'torta para 20 personas de chocolate',
      domain: 'cake',
      entities: { servings: 20, flavors: ['Chocolate'], confidence_score: 0.9 },
      web_references: [],
    });

    expect(component.attributeKeys()).toEqual(['servings', 'flavors']);
    expect(component.attributesForm.controls['flavors'].value).toBe('Chocolate');
    expect(component.confidence()).toBe(0.9);
  });
});
