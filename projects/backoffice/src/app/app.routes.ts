import { Routes } from '@angular/router';
import { staffGuard } from '@ecotanti/shared-auth';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Acceso Administrativo - EcoTanti',
    data: { title: 'Iniciar Sesión' },
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/layout').then((m) => m.AdminLayoutComponent),
    canActivate: [staffGuard],
    children: [
      {
        path: 'home',
        title: 'Panel de Control - EcoTanti Backoffice',
        loadComponent: () =>
          import('./features/home/home').then((m) => m.HomeComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
