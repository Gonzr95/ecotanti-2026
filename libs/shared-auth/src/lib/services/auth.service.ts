import { inject, Service, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
  permissions?: string[];
}

@Service()
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Permisos explícitos asignados al usuario en la sesión activa
   */
  readonly userPermissions = signal<string[]>([]);

  /**
   * Verifica si el usuario cuenta con un permiso específico
   */
  hasPermission(code: string): boolean {
    return this.userPermissions().includes(code);
  }

  /**
   * Verifica si el usuario cuenta con al menos uno de los permisos provistos
   */
  hasAnyPermission(codes: string[]): boolean {
    const userPerms = this.userPermissions();
    return codes.some((code) => userPerms.includes(code));
  }

  /**
   * Carga los permisos explícitos del usuario desde la base de datos
   */
  async loadUserPermissions(userId: string): Promise<string[]> {
    try {
      // 1. Obtener roles del usuario
      const { data: userRoles, error: rolesError } = await this.supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId);

      if (rolesError || !userRoles || userRoles.length === 0) {
        this.userPermissions.set([]);
        return [];
      }

      const roleIds = userRoles.map((r) => r.role_id);

      // 2. Obtener permission_id asociados a esos roles en role_permissions
      let permIds: number[] = [];

      // Consultar con 'rol_id' (nombre de columna real en la base de datos)
      const { data: rolePerms, error: permError } = await this.supabase
        .from('role_permissions')
        .select('permission_id')
        .in('rol_id', roleIds);

      if (!permError && rolePerms && rolePerms.length > 0) {
        permIds = rolePerms.map((rp: any) => rp.permission_id);
      } else {
        // Fallback a 'role_id' por retrocompatibilidad
        const { data: fallbackRolePerms } = await this.supabase
          .from('role_permissions')
          .select('permission_id')
          .in('role_id', roleIds);

        if (fallbackRolePerms && fallbackRolePerms.length > 0) {
          permIds = fallbackRolePerms.map((rp: any) => rp.permission_id);
        }
      }

      if (permIds.length === 0) {
        this.userPermissions.set([]);
        return [];
      }

      // 3. Obtener los códigos de permissions
      const { data: permissionsData, error: permCodesError } = await this.supabase
        .from('permissions')
        .select('code')
        .in('id', permIds);

      if (permCodesError || !permissionsData) {
        console.error('Error al consultar permissions en Supabase:', permCodesError);
        this.userPermissions.set([]);
        return [];
      }

      const uniquePerms = Array.from(new Set(permissionsData.map((p) => p.code)));
      this.userPermissions.set(uniquePerms);
      return uniquePerms;
    } catch (err) {
      console.error('Error al cargar permisos del usuario:', err);
      this.userPermissions.set([]);
      return [];
    }
  }

  /**
   * Autenticación para personal administrativo del Backoffice.
   * Valida credenciales, verifica roles en 'user_roles' y aplica ofuscación de seguridad.
   */
  async loginStaff(email: string, password: string): Promise<AuthResult> {
    try {
      const cleanEmail = email.trim();

      // 1. Validar email y password en Supabase Auth
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError || !authData.user) {
        return {
          success: false,
          error: 'Credenciales incorrectas',
        };
      }

      // 2. Verificar si el usuario tiene roles de staff asignados en user_roles
      const { data: userRoles, error: rolesError } = await this.supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', authData.user.id);

      if (rolesError) {
        console.error('Error al consultar user_roles en Supabase:', rolesError);
      }

      if (rolesError || !userRoles || userRoles.length === 0) {
        // Intento de acceso no autorizado (cliente o usuario sin roles de staff)
        // Se registra silenciosamente en security_logs para auditoría
        try {
          const { error: logError } = await this.supabase.from('security_logs').insert({
            user_id: authData.user.id,
            attempted_mail: cleanEmail,
            event_type: 'unauthorized_backoffice_attempt',
            metadata: {
              reason: 'Usuario autenticado sin roles de personal en user_roles',
            },
          });
          if (logError) {
            console.error('Error al registrar security_log en Supabase:', logError);
          }
        } catch (logErr) {
          console.error('Error al registrar security_log:', logErr);
        }

        // Se destruye de inmediato la sesión
        await this.supabase.auth.signOut();

        // Ofuscación total: mismo mensaje de error
        return {
          success: false,
          error: 'Credenciales incorrectas',
        };
      }

      // Usuario autenticado con roles de staff válidos.
      // Cargamos sus permisos explícitos asignados:
      const permissions = await this.loadUserPermissions(authData.user.id);

      return {
        success: true,
        user: authData.user,
        permissions,
      };
    } catch (err) {
      console.error('Error inesperado durante el login:', err);
      return {
        success: false,
        error: 'Ocurrió un error al procesar el inicio de sesión',
      };
    }
  }

  /**
   * Cierra la sesión activa en Supabase y limpia el estado reactivo de permisos
   */
  async logout(): Promise<void> {
    this.userPermissions.set([]);
    await this.supabase.auth.signOut();
  }

  /**
   * Obtiene el usuario actual en sesión
   */
  async getCurrentUser(): Promise<User | null> {
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }
}

