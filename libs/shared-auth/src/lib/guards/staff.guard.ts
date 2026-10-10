import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SupabaseService } from '../services/supabase.service';

/**
 * Guardia funcional de Angular que protege las rutas del Backoffice.
 * Permite el acceso únicamente a usuarios autenticados que posean al menos un rol en `user_roles`.
 * Si no está autenticado o no posee rol de staff, redirige de forma segura a la raíz `/`.
 */
export const staffGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  try {
    const user = await authService.getCurrentUser();
    if (!user) {
      return router.createUrlTree(['/']);
    }

    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', user.id);

    if (error || !userRoles || userRoles.length === 0) {
      await authService.logout();
      return router.createUrlTree(['/']);
    }

    // Asegurar que los permisos estén cargados en el Signal de AuthService (incluso tras F5 / refresh)
    if (authService.userPermissions && authService.userPermissions().length === 0) {
      try {
        await authService.loadUserPermissions(user.id);
      } catch (loadErr) {
        console.warn('Advertencia al cargar permisos en staffGuard:', loadErr);
      }
    }

    return true;
  } catch {
    return router.createUrlTree(['/']);
  }
};

