import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guardia funcional de Angular para acceso a la pantalla de Login (guest only).
 * Si el usuario ya está autenticado como staff en el Backoffice, lo redirige directamente a `/home`.
 */
export const guestOnlyGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    const user = await authService.getCurrentUser();
    if (!user) {
      return true;
    }

    // Si ya tiene usuario, cargar permisos y redirigir a /home
    await authService.loadUserPermissions(user.id);
    return router.createUrlTree(['/home']);
  } catch {
    return true;
  }
};

/**
 * Guardia funcional que valida permisos explícitos sobre una ruta.
 * Lee el permiso requerido desde route.data['permission'] o route.data['permissions'].
 * Si el usuario no tiene el permiso, lo mantiene dentro del sistema pero lo redirige a `/home`.
 */
export const permissionGuard: CanActivateFn = async (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    const user = await authService.getCurrentUser();
    if (!user) {
      return router.createUrlTree(['/']);
    }

    // Asegurar que los permisos estén cargados en el Signal
    if (authService.userPermissions().length === 0) {
      await authService.loadUserPermissions(user.id);
    }

    const requiredPermission = route.data?.['permission'] as string | undefined;
    const requiredPermissions = route.data?.['permissions'] as string[] | undefined;

    if (requiredPermission && !authService.hasPermission(requiredPermission)) {
      return router.createUrlTree(['/home']);
    }

    if (requiredPermissions && !authService.hasAnyPermission(requiredPermissions)) {
      return router.createUrlTree(['/home']);
    }

    return true;
  } catch {
    return router.createUrlTree(['/home']);
  }
};

