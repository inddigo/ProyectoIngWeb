import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Nuevo pedido',
    loadComponent: () =>
      import('./features/customer-portal/customer-portal.component').then(
        (m) => m.CustomerPortalComponent,
      ),
  },
  {
    path: 'login',
    title: 'Ingresar',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'mis-pedidos',
    title: 'Mis pedidos',
    canActivate: [authGuard],
    data: { role: 'CLIENT' },
    loadComponent: () =>
      import('./features/client-dashboard/client-dashboard.component').then(
        (m) => m.ClientDashboardComponent,
      ),
  },
  {
    path: 'dashboard',
    title: 'Panel profesional',
    canActivate: [authGuard],
    data: { role: 'BAKER' },
    loadComponent: () =>
      import('./features/baker-dashboard/baker-dashboard.component').then(
        (m) => m.BakerDashboardComponent,
      ),
  },
  { path: 'client-dashboard', redirectTo: 'mis-pedidos' },
  { path: '**', redirectTo: '' },
];
