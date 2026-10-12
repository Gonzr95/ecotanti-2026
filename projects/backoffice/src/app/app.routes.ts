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
        path: 'combos',
        title: 'Combos y Promociones - EcoTanti Backoffice',
        canActivate: [permissionGuard],
        data: { permission: 'catalog.bundles.view' },
        loadComponent: () =>
          import('./features/catalog/bundles/bundles').then((m) => m.BundlesComponent),
      },
      {
        path: 'ofertas',
        title: 'Ofertas y Promociones - EcoTanti Backoffice',
        canActivate: [permissionGuard],
        data: { permission: 'catalog.offers.view' },
        loadComponent: () =>
          import('./features/catalog/offers/offers').then((m) => m.OffersComponent),
      },
      {
        path: 'pedidos',
        title: 'Gestión de Pedidos - EcoTanti Backoffice',
        canActivate: [permissionGuard],
        data: { permission: 'orders.view' },
        loadComponent: () =>
          import('./features/sales/orders/orders').then((m) => m.OrdersComponent),
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

