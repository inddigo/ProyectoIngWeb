import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    service.logout();
  });

  afterEach(() => http.verify());

  it('guarda la sesión tras el login', () => {
    service.login('b@b.cl', 'secret').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/auth/login'));
    expect(req.request.body).toEqual({ email: 'b@b.cl', password: 'secret' });
    req.flush({ access_token: 'tok', user: { id: '1', email: 'b@b.cl', name: 'B', role: 'BAKER' } });

    expect(service.getToken()).toBe('tok');
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.homeFor()).toBe('/dashboard');
  });

  it('limpia la sesión al cerrar sesión', () => {
    service.currentUser.set({ id: '1', email: 'c@c.cl', name: 'C', role: 'CLIENT' });
    service.logout();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getToken()).toBeNull();
  });
});
