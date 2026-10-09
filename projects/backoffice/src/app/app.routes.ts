import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Acceso Administrativo - EcoTanti',
    data: { title: 'Iniciar Sesión' },
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
];
