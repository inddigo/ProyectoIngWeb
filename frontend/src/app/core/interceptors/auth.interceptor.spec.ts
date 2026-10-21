import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: { getToken: () => 'private-token' } },
    ] });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });
  afterEach(() => controller.verify());

  it('envía el token solo a la API configurada', () => {
    const url = `${environment.apiUrl}/api/v1/orders/mine`;
    http.get(url).subscribe();
    const req = controller.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe('Bearer private-token');
    req.flush([]);
  });

  it('no filtra el token a imágenes, sitios externos ni dominios parecidos', () => {
    for (const url of ['https://example.org/api/data', 'https://localhost.evil.example/api/data', '/idea-studio.svg']) {
      http.get(url).subscribe();
      const req = controller.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    }
  });
});
