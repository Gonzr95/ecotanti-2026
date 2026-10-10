import { Routes } from '@angular/router';
import { guestOnlyGuard, permissionGuard, staffGuard } from '@ecotanti/shared-auth';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Acceso Administrativo - EcoTanti',
    data: { title: 'Iniciar Sesión' },
    canActivate: [guestOnlyGuard],
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
      {
        path: 'marcas',
        title: 'Marcas - EcoTanti Backoffice',
        canActivate: [permissionGuard],
        data: { permission: 'catalog.brands.view' },
        loadComponent: () =>
          import('./features/catalog/brands/brands').then((m) => m.BrandsComponent),
      },
      {
        path: 'productos',
        title: 'Productos - EcoTanti Backoffice',
        canActivate: [permissionGuard],
        data: { permission: 'catalog.products.view' },
        loadComponent: () =>
          import('./features/catalog/products/products').then((m) => m.ProductsComponent),
      },
      {
        path: '**',
        redirectTo: 'home',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];

