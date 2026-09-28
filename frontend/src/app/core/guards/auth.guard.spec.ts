import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let auth: AuthService;
  let router: Router;

  const run = (role?: string) =>
    TestBed.runInInjectionContext(() =>
      authGuard(
        { data: role ? { role } : {} } as unknown as ActivatedRouteSnapshot,
        { url: '/dashboard' } as RouterStateSnapshot,
      ),
    );

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    auth.logout();
  });

  it('redirige a login si no hay sesión', () => {
    const result = run('BAKER') as UrlTree;
    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fdashboard');
  });

  it('redirige al inicio del rol si el rol no coincide', () => {
    auth.currentUser.set({ id: '1', email: 'c@c.cl', name: 'C', role: 'CLIENT' });
    const result = run('BAKER') as UrlTree;
    expect(router.serializeUrl(result)).toBe('/mis-pedidos');
  });

  it('permite el acceso con el rol correcto', () => {
    auth.currentUser.set({ id: '1', email: 'b@b.cl', name: 'B', role: 'BAKER' });
    expect(run('BAKER')).toBeTrue();
  });
});
