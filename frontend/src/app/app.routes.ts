import { Routes } from '@angular/router';
import { CustomerPortalComponent } from './features/customer-portal/customer-portal.component';
import { LoginComponent } from './features/login/login.component';
import { BakerDashboardComponent } from './features/baker-dashboard/baker-dashboard.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: CustomerPortalComponent },
  { path: 'login', component: LoginComponent },
  { 
    path: 'dashboard', 
    component: BakerDashboardComponent,
    canActivate: [authGuard],
    data: { role: 'BAKER' }
  },
  { path: '**', redirectTo: '' }
];
